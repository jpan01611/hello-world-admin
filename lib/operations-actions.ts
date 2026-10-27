'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth';
import { OPERATION_RESOURCES, type OperationResource } from '@/lib/operations';

function resource(value: string): OperationResource {
    if (!OPERATION_RESOURCES.includes(value as OperationResource)) throw new Error('Unsupported operations resource.');
    return value as OperationResource;
}

function text(formData: FormData, key: string) {
    return String(formData.get(key) ?? '').trim();
}

function payload(formData: FormData, table: OperationResource) {
    const name = text(formData, 'name') || text(formData, 'term') || text(formData, 'domain') || text(formData, 'email');
    const description = text(formData, 'description') || text(formData, 'input');
    const content = text(formData, 'content') || text(formData, 'definition') || text(formData, 'prompt') || text(formData, 'output') || text(formData, 'response');
    const active = text(formData, 'active') !== 'false';
    if (table === 'terms') return { term: name, definition: content || description, active };
    if (table === 'allowed_signup_domains') return { domain: name, active };
    if (table === 'whitelisted_email_addresses') return { email: name, active };
    if (table === 'prompt_chain_steps') return { name, prompt: content || description, step_order: Number(text(formData, 'step_order') || 1), chain_id: text(formData, 'chain_id') || null };
    if (table === 'prompt_chain_mix') return { name, weight: Number(text(formData, 'weight') || 1), active, chain_id: text(formData, 'chain_id') || null };
    if (table === 'generation_requests') return { status: text(formData, 'status') || 'pending', provider: text(formData, 'provider') || null, model: text(formData, 'model') || null, input: content || description, output: text(formData, 'output') || null };
    if (table === 'ai_generation_examples') return { name, input: description, output: content, active };
    if (table === 'llm_providers') return { name, base_url: text(formData, 'base_url') || null, active };
    if (table === 'llm_models') return { name, model_key: text(formData, 'model_key') || name, provider_id: text(formData, 'provider_id') || null, active };
    if (table === 'llm_responses') return { provider: text(formData, 'provider') || null, model: text(formData, 'model') || null, response: content || description, request_id: text(formData, 'request_id') || null };
    if (table === 'images') return { image_url: text(formData, 'image_url'), context: text(formData, 'context') || null, created_by: text(formData, 'created_by') || null, selected_caption_id: text(formData, 'selected_caption_id') || null };
    return { name, description, active };
}

export async function createOperation(resourceName: string, formData: FormData) {
    const { supabase } = await requireSuperadmin();
    const table = resource(resourceName);
    const values = payload(formData, table);
    if (!Object.values(values).some((value) => value !== '' && value !== null && value !== undefined)) throw new Error('Enter a value before saving.');
    const { error } = await supabase.from(table as string).insert(values as never);
    if (error) throw new Error(`Could not create record: ${error.message}`);
    revalidatePath('/admin/operations');
}

export async function updateOperation(resourceName: string, id: string, formData: FormData) {
    const { supabase } = await requireSuperadmin();
    const table = resource(resourceName);
    if (!id) throw new Error('Record ID is required.');
    const values = payload(formData, table);
    const withTimestamp = ['prompt_chains', 'prompt_chain_mix', 'terms', 'ai_generation_examples', 'llm_models', 'llm_providers'].includes(table)
        ? { ...values, updated_at: new Date().toISOString() }
        : values;
    const { error } = await supabase.from(table as string).update(withTimestamp as never).eq('id', id);
    if (error) throw new Error(`Could not update record: ${error.message}`);
    revalidatePath('/admin/operations');
}

export async function deleteOperation(resourceName: string, id: string) {
    const { supabase } = await requireSuperadmin();
    const table = resource(resourceName);
    if (!id) throw new Error('Record ID is required.');
    const { error } = await supabase.from(table as string).delete().eq('id', id);
    if (error) throw new Error(`Could not delete record: ${error.message}`);
    revalidatePath('/admin/operations');
}
