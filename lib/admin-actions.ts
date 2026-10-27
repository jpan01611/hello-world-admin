'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticated, requireMediaAdmin, requireSuperadmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { generateDescription, generateFunnyCaption } from '@/lib/ai/captions';
import { uploadSizeError } from '@/lib/upload-limits';

const IMAGES_BUCKET = 'images';

function text(formData: FormData, name: string) {
    return String(formData.get(name) ?? '').trim();
}

function requiredUrl(value: string) {
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
        throw new Error('Image URL must be a valid HTTP or HTTPS URL.');
    }
}

function mediaInput(formData: FormData) {
    const imageUrl = text(formData, 'image_url');
    const description = text(formData, 'description');
    const caption = text(formData, 'caption');
    if (!imageUrl || !description || !caption) throw new Error('Image URL, description, and caption are required.');
    requiredUrl(imageUrl);
    return { imageUrl, description, caption, visionPrompt: text(formData, 'vision_prompt'), captionPrompt: text(formData, 'caption_prompt') };
}

export async function createMedia(formData: FormData) {
    const { supabase, user } = await requireSuperadmin();
    const input = mediaInput(formData);
    const { data: image, error: imageError } = await supabase.from('images')
        .insert({ image_url: input.imageUrl, created_by: user.id }).select('id').single();
    if (imageError || !image) throw new Error(imageError?.message ?? 'Could not create source image.');
    const { error } = await supabase.from('captions').insert({
        image_id: image.id, created_by: user.id, description: input.description, caption: input.caption,
        vision_prompt: input.visionPrompt || null, caption_prompt: input.captionPrompt || null,
    });
    if (error) {
        await supabase.from('images').delete().eq('id', image.id);
        throw new Error(error.message);
    }

    revalidatePath('/admin');
    revalidatePath('/admin/media');
    redirect('/admin/media');
}

export async function generateMedia(formData: FormData) {
    const { supabase, user, profile } = await requireMediaAdmin();
    const file = formData.get('file');
    const submittedUrl = text(formData, 'image_url');
    const context = text(formData, 'context').slice(0, 500);
    const captionOverride = text(formData, 'caption_override').slice(0, 500);
    const requestedOwnerId = profile.role === 'superadmin' || profile.is_superadmin ? text(formData, 'created_by') || user.id : user.id;
    let imageUrl = submittedUrl;
    let storagePath: string | null = null;

    if (file instanceof File && file.size > 0) {
        if (!file.type.startsWith('image/')) throw new Error('Please choose a JPG, PNG, GIF, or WebP image.');
        const sizeError = uploadSizeError(file);
        if (sizeError) throw new Error(sizeError);
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        storagePath = `admin-${user.id}-${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(`Could not upload image: ${error.message}`);
        imageUrl = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    } else {
        if (!imageUrl) throw new Error('Upload an image or enter a hosted image URL.');
        requiredUrl(imageUrl);
    }

    const { data: owner, error: ownerError } = await supabase.from('profiles').select('id').eq('id', requestedOwnerId).maybeSingle();
    if (ownerError || !owner) {
        if (storagePath) await supabase.storage.from(IMAGES_BUCKET).remove([storagePath]);
        throw new Error(ownerError?.message ?? 'Selected image owner was not found.');
    }

    const { data: image, error: imageError } = await supabase.from('images')
        .insert({ image_url: imageUrl, context: context || null, created_by: requestedOwnerId })
        .select('id, image_url')
        .single();
    if (imageError || !image) {
        if (storagePath) await supabase.storage.from(IMAGES_BUCKET).remove([storagePath]);
        throw new Error(imageError?.message ?? 'Could not create source image.');
    }

    try {
        const { description, prompt: visionPrompt } = await generateDescription(image.image_url);
        const generated = await generateFunnyCaption(description, context);
        const caption = captionOverride || generated.caption;
        const { error } = await supabase.from('captions').insert({
            image_id: image.id,
            created_by: user.id,
            description,
            caption,
            vision_prompt: visionPrompt,
            caption_prompt: generated.prompt,
        });
        if (error) throw new Error(error.message);
    } catch (error) {
        await supabase.from('images').delete().eq('id', image.id);
        if (storagePath) await supabase.storage.from(IMAGES_BUCKET).remove([storagePath]);
        throw error instanceof Error ? error : new Error('Could not generate media.');
    }

    revalidatePath('/admin');
    revalidatePath('/admin/media');
    redirect('/admin/media');
}

export async function generateAdditionalCaption(captionId: string) {
    const { supabase, user } = await requireSuperadmin();
    if (!captionId) throw new Error('Caption ID is required.');

    const { data: sourceCaption, error: captionError } = await supabase
        .from('captions')
        .select('image_id')
        .eq('id', captionId)
        .maybeSingle();
    if (captionError) throw new Error(`Unable to load source caption: ${captionError.message}`);
    if (!sourceCaption) throw new Error('Caption record not found.');

    const { data: image, error: imageError } = await supabase
        .from('images')
        .select('id, image_url, context, selected_caption_id')
        .eq('id', sourceCaption.image_id)
        .maybeSingle();
    if (imageError) throw new Error(`Unable to load source image: ${imageError.message}`);
    if (!image) throw new Error('Source image not found.');

    const { description, prompt: visionPrompt } = await generateDescription(image.image_url);
    const { caption, prompt: captionPrompt } = await generateFunnyCaption(description, image.context);
    const { data: createdCaption, error: insertError } = await supabase.from('captions').insert({
        image_id: image.id,
        created_by: user.id,
        description,
        caption,
        vision_prompt: visionPrompt,
        caption_prompt: captionPrompt,
    }).select('id').single();
    if (insertError || !createdCaption) {
        throw new Error(insertError?.message ?? 'Could not save the generated caption.');
    }

    revalidatePath('/admin');
    revalidatePath('/admin/media');
    revalidatePath(`/admin/media/${captionId}`);
    revalidatePath(`/admin/media/${createdCaption.id}`);
    redirect(`/admin/media/${createdCaption.id}`);
}

export async function setCaptionShownInFeed(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const captionId = text(formData, 'caption_id');
    const shownInFeed = text(formData, 'shown_in_feed') === 'true';
    if (!captionId) throw new Error('Caption ID is required.');

    const { data: caption, error: captionError } = await supabase
        .from('captions')
        .select('image_id')
        .eq('id', captionId)
        .maybeSingle();
    if (captionError) throw new Error(`Unable to load caption: ${captionError.message}`);
    if (!caption) throw new Error('Caption record not found.');

    const { data: image, error: imageError } = await supabase
        .from('images')
        .select('id, created_by, selected_caption_id')
        .eq('id', caption.image_id)
        .maybeSingle();
    if (imageError) throw new Error(`Unable to load source image: ${imageError.message}`);
    if (!image) throw new Error('Source image not found.');

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', user.id)
        .maybeSingle();
    const isOwner = image.created_by === user.id;
    const isSuperadmin = profile?.is_superadmin === true;
    if (!isOwner && !isSuperadmin) {
        throw new Error('You can only choose a caption for your own image.');
    }

    const { error: updateError } = await supabase
        .from('images')
        .update({ selected_caption_id: shownInFeed ? captionId : null })
        .eq('id', image.id)
        .eq(isSuperadmin ? 'id' : 'created_by', isSuperadmin ? image.id : user.id);
    if (updateError) throw new Error(`Unable to update feed selection: ${updateError.message}`);

    revalidatePath('/admin');
    revalidatePath('/admin/media');
    revalidatePath(`/admin/media/${captionId}`);
}

export async function updateMedia(id: string, formData: FormData) {
    const { supabase } = await requireSuperadmin();
    if (!id) throw new Error('Media ID is required.');
    const input = mediaInput(formData);
    const { data: current, error: lookupError } = await supabase.from('captions').select('image_id').eq('id', id).single();
    if (lookupError || !current) throw new Error('Media record not found.');
    const { error: imageError } = await supabase.from('images').update({ image_url: input.imageUrl }).eq('id', current.image_id);
    const { error } = await supabase.from('captions').update({
        description: input.description, caption: input.caption,
        vision_prompt: input.visionPrompt || null, caption_prompt: input.captionPrompt || null,
    }).eq('id', id);
    if (imageError || error) throw new Error(imageError?.message ?? error?.message ?? 'Could not update media.');
    revalidatePath('/admin');
    revalidatePath('/admin/media');
    revalidatePath(`/admin/media/${id}`);
    redirect('/admin/media');
}

export async function deleteMedia(id: string) {
    const { supabase, user, profile } = await requireAuthenticated();
    if (!id) throw new Error('Media ID is required.');
    const { data: current, error: lookupError } = await supabase.from('captions').select('image_id').eq('id', id).single();
    if (lookupError || !current) throw new Error('Media record not found.');
    const { data: image, error: imageLookupError } = await supabase.from('images').select('created_by').eq('id', current.image_id).maybeSingle();
    if (imageLookupError || !image) throw new Error('Media image not found.');
    const imageOwner = image.created_by;
    if (profile?.is_superadmin !== true && imageOwner !== user.id) {
        throw new Error('You can only delete media from your own images.');
    }
    const { error } = await supabase.from('captions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    const { count } = await supabase.from('captions').select('id', { count: 'exact', head: true }).eq('image_id', current.image_id);
    if (count === 0) await supabase.from('images').delete().eq('id', current.image_id);
    revalidatePath('/admin');
    revalidatePath('/admin/media');
}

export async function signOut() {
    const { supabase } = await requireAuthenticated();
    await supabase.auth.signOut();
    redirect('/login');
}

export async function setSuperadmin(formData: FormData) {
    const { supabase, user } = await requireSuperadmin();
    const userId = text(formData, 'user_id');
    const isSuperadmin = text(formData, 'is_superadmin') === 'true';
    if (!userId) throw new Error('User ID is required.');
    if (userId === user.id && !isSuperadmin) {
        throw new Error('You cannot revoke your own superadmin access.');
    }

    const { data: target, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
    if (lookupError) throw new Error(`Unable to load user: ${lookupError.message}`);
    if (!target) throw new Error('User profile not found.');

    const { error } = await supabase.from('profiles')
        .update({ is_superadmin: isSuperadmin })
        .eq('id', userId);
    if (error) throw new Error(`Unable to update access: ${error.message}`);
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);
}

export async function setUserRole(formData: FormData) {
    const { supabase, user } = await requireSuperadmin();
    const userId = text(formData, 'user_id');
    const role = text(formData, 'role');
    if (!userId || !['member', 'admin', 'superadmin'].includes(role)) throw new Error('A valid user and role are required.');
    if (userId === user.id && role !== 'superadmin') throw new Error('You cannot remove your own superadmin access.');
    const { error } = await supabase.from('profiles').update({ role, is_superadmin: role === 'superadmin' }).eq('id', userId);
    if (error) throw new Error(`Unable to update role: ${error.message}`);
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);
}
