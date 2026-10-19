'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <button className="button" type="submit" disabled={pending}>{pending ? 'Generating media...' : 'Generate media'}</button>;
}

export default function GenerateMediaForm({ action, profiles, currentUserId, children }: { action: (formData: FormData) => void | Promise<void>; profiles: { id: string; first_name: string | null; last_name: string | null }[]; currentUserId: string; children?: ReactNode }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewSource, setPreviewSource] = useState<'file' | 'url' | ''>('');
    const [previewError, setPreviewError] = useState('');
    const [error, submitAction] = useActionState(async (_previous: string, formData: FormData) => {
        try {
            await action(formData);
            return '';
        } catch (caught) {
            if (typeof caught === 'object' && caught !== null && 'digest' in caught && String(caught.digest).startsWith('NEXT_REDIRECT')) throw caught;
            return caught instanceof Error ? caught.message : 'Media generation failed. Check the image source and try again.';
        }
    }, '');

    useEffect(() => () => {
        if (previewSource === 'file' && previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewSource, previewUrl]);

    function clearPreview() {
        if (previewSource === 'file' && previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        setPreviewSource('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function updateFile(file: File | undefined) {
        if (previewSource === 'file' && previewUrl) URL.revokeObjectURL(previewUrl);
        if (!file) return clearPreview();
        if (!file.type.startsWith('image/')) {
            setPreviewError('This file is not a supported image. Choose a JPG, PNG, GIF, or WebP file.');
            return clearPreview();
        }
        if (file.size > 2 * 1024 * 1024) {
            setPreviewError('This image is larger than 2 MB. Choose a smaller file and try again.');
            return clearPreview();
        }
        setPreviewError('');
        setPreviewUrl(URL.createObjectURL(file));
        setPreviewSource('file');
    }

    return <form action={submitAction} className="form-grid" encType="multipart/form-data">
        <fieldset className="source-options"><legend>Source image</legend><input ref={fileInputRef} className="visually-hidden" name="file" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => updateFile(event.target.files?.[0])} /><button className="button secondary upload-photo-button" type="button" onClick={() => fileInputRef.current?.click()}>Upload photo</button><p className="muted form-help">Choose a JPG, PNG, GIF, or WebP up to 2 MB, or use a hosted image URL below.</p><label>Hosted image URL<input name="image_url" type="url" placeholder="https://..." onChange={(event) => { setPreviewError(''); if (!previewSource || previewSource === 'url') { setPreviewUrl(event.target.value); setPreviewSource(event.target.value ? 'url' : ''); } }} /></label>{previewError && <p className="form-error" role="alert">{previewError}</p>}{previewUrl && <div className="image-preview-panel"><div className="image-preview-frame"><img src={previewUrl} alt="Selected source preview" onError={() => { if (previewSource === 'url') { setPreviewUrl(''); setPreviewError('This image URL could not be loaded. Confirm it is public, points directly to an image, and uses HTTP or HTTPS.'); } }} /><button className="image-preview-remove" type="button" aria-label="Remove selected image" onClick={clearPreview}>×</button></div><span>{previewSource === 'file' ? 'Upload preview' : 'URL preview'}</span></div>}</fieldset>
        <label>Image owner <select name="created_by" defaultValue={currentUserId}><option value={currentUserId}>Current admin</option>{profiles.filter((profile) => profile.id !== currentUserId).map((profile) => <option key={profile.id} value={profile.id}>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unnamed user'}</option>)}</select></label>
        <label>Creator context <span className="muted">(optional)</span><textarea name="context" maxLength={500} placeholder="Add NYC or Columbia context to guide the caption." /></label>
        <label>Caption override <span className="muted">(optional)</span><textarea name="caption_override" maxLength={500} placeholder="Leave blank to use the generated caption." /></label>
        <p className="muted form-help">The image is analyzed first, then Gemini writes a short caption using the visual analysis and optional context.</p>
        <div>{error && <p className="form-error" role="alert">{error} Check that the image is accessible and try again.</p>}{children}<SubmitButton /></div>
    </form>;
}
