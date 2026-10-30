'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth';
import { canManageOperation, OPERATION_RESOURCES, type OperationResource } from '@/lib/operations';

function resource(value: string): OperationResource {
    if (!OPERATION_RESOURCES.includes(value as OperationResource)) throw new Error('Unsupported operations resource.');
    return value as OperationResource;
}

function text(formData: FormData, key: string) {
    return String(formData.get(key) ?? '').trim();
}

const uniqueFields: Partial<Record<OperationResource, { field: string; label: string }>> = {
    terms: { field: 'term', label: 'term' },
    llm_generation_steps: { field: 'step_key', label: 'step key' },
    llm_providers: { field: 'name', label: 'provider name' },
    allowed_signup_domains: { field: 'domain', label: 'signup domain' },
    whitelisted_email_addresses: { field: 'email', label: 'email address' },
};

async function ensureUnique(supabase: Awaited<ReturnType<typeof requireSuperadmin>>['supabase'], table: OperationResource, values: Record<string, unknown>, id?: string) {
    const unique = uniqueFields[table];
    if (!unique || !values[unique.field]) return;
    let query = supabase.from(table).select('id').eq(unique.field, values[unique.field]).limit(1);
    if (id) query = query.neq('id', id);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Unable to validate ${unique.label}: ${error.message}`);
    if (data) throw new Error(`That ${unique.label} already exists. Edit the existing record instead.`);
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
    if (table === 'llm_providers') return { name, base_url: text(formData, 'base_url') || null, secret_env_var: text(formData, 'secret_env_var') || null, active };
    if (table === 'llm_models') return { name, model_key: text(formData, 'model_key') || name, provider_id: text(formData, 'provider_id') || null, active };
    if (table === 'llm_generation_steps') return {
        step_key: text(formData, 'step_key'),
        display_name: text(formData, 'display_name'),
        prompt_template: text(formData, 'prompt_template'),
        max_tokens: Number(text(formData, 'max_tokens') || 120),
        max_output_chars: Number(text(formData, 'max_output_chars') || 500),
        temperature: text(formData, 'temperature') ? Number(text(formData, 'temperature')) : null,
        thinking_budget: text(formData, 'thinking_budget') ? Number(text(formData, 'thinking_budget')) : null,
        model_id: text(formData, 'model_id') || null,
        active,
    };
    if (table === 'llm_responses') return { provider: text(formData, 'provider') || null, model: text(formData, 'model') || null, response: content || description, request_id: text(formData, 'request_id') || null };
    if (table === 'images') return { image_url: text(formData, 'image_url'), context: text(formData, 'context') || null, created_by: text(formData, 'created_by') || null, selected_caption_id: text(formData, 'selected_caption_id') || null };
    return { name, description, active };
}

export async function createOperation(resourceName: string, formData: FormData) {
    const { supabase } = await requireSuperadmin();
    const table = resource(resourceName);
    if (!canManageOperation(table)) throw new Error('This resource is read-only.');
    const values = payload(formData, table);
    if (table === 'llm_generation_steps') {
        const stepKey = String(values.step_key);
        const template = String(values.prompt_template);
        if (!['vision_analysis', 'caption_generation'].includes(stepKey)) throw new Error('Step key must be vision_analysis or caption_generation.');
        if (stepKey === 'vision_analysis' && !template.includes('{image}')) throw new Error('Vision prompt must include the {image} placeholder.');
        if (stepKey === 'caption_generation' && (!template.includes('{description}') || !template.includes('{context}'))) throw new Error('Caption prompt must include {description} and {context} placeholders.');
        if (Number(values.max_tokens) < 1 || Number(values.max_tokens) > 4000 || Number(values.max_output_chars) < 1 || Number(values.max_output_chars) > 10000) throw new Error('Token and character limits are outside the safe range.');
    }
    if (!Object.values(values).some((value) => value !== '' && value !== null && value !== undefined)) throw new Error('Enter a value before saving.');
    await ensureUnique(supabase, table, values);
    const { error } = await supabase.from(table as string).insert(values as never);
    if (error) {
        if (error.code === '23505') throw new Error('A record with the same unique value already exists. Edit the existing record instead.');
        throw new Error(`Could not create record: ${error.message}`);
    }
    revalidatePath('/admin/operations');
}

export async function updateOperation(resourceName: string, id: string, formData: FormData) {
    const { supabase } = await requireSuperadmin();
    const table = resource(resourceName);
    if (!canManageOperation(table)) throw new Error('This resource is read-only.');
    if (!id) throw new Error('Record ID is required.');
    const values = payload(formData, table);
    if (table === 'llm_generation_steps') {
        const stepKey = String(values.step_key);
        const template = String(values.prompt_template);
        if (!['vision_analysis', 'caption_generation'].includes(stepKey)) throw new Error('Step key must be vision_analysis or caption_generation.');
        if (stepKey === 'vision_analysis' && !template.includes('{image}')) throw new Error('Vision prompt must include the {image} placeholder.');
        if (stepKey === 'caption_generation' && (!template.includes('{description}') || !template.includes('{context}'))) throw new Error('Caption prompt must include {description} and {context} placeholders.');
        if (Number(values.max_tokens) < 1 || Number(values.max_tokens) > 4000 || Number(values.max_output_chars) < 1 || Number(values.max_output_chars) > 10000) throw new Error('Token and character limits are outside the safe range.');
    }
    await ensureUnique(supabase, table, values, id);
    const withTimestamp = ['prompt_chains', 'prompt_chain_mix', 'terms', 'ai_generation_examples', 'llm_models', 'llm_providers'].includes(table)
        ? { ...values, updated_at: new Date().toISOString() }
        : values;
    const { error } = await supabase.from(table as string).update(withTimestamp as never).eq('id', id);
    if (error) {
        if (error.code === '23505') throw new Error('A record with the same unique value already exists. Choose a different value.');
        throw new Error(`Could not update record: ${error.message}`);
    }
    revalidatePath('/admin/operations');
}

export async function deleteOperation(resourceName: string, id: string) {
    const { supabase } = await requireSuperadmin();
    const table = resource(resourceName);
    if (!canManageOperation(table)) throw new Error('This resource is read-only.');
    if (!id) throw new Error('Record ID is required.');
    const { error } = await supabase.from(table as string).delete().eq('id', id);
    if (error) throw new Error(`Could not delete record: ${error.message}`);
    revalidatePath('/admin/operations');
}
