'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createOperation, deleteOperation, updateOperation } from '@/lib/operations-actions';
import { OPERATION_LABELS, type OperationResource } from '@/lib/operations';

const fieldLabels: Record<string, string[]> = {
    prompt_chains: ['name', 'description', 'active'], prompt_chain_steps: ['name', 'prompt', 'step_order', 'chain_id'],
    prompt_chain_mix: ['name', 'weight', 'chain_id', 'active'], terms: ['term', 'definition', 'active'],
    generation_requests: ['status', 'provider', 'model', 'input', 'output'], ai_generation_examples: ['name', 'input', 'output', 'active'],
    llm_models: ['name', 'model_key', 'provider_id', 'active'], llm_providers: ['name', 'base_url', 'secret_env_var', 'active'],
    llm_generation_steps: ['step_key', 'display_name', 'prompt_template', 'max_tokens', 'max_output_chars', 'temperature', 'thinking_budget', 'model_id', 'active'],
    llm_responses: ['provider', 'model', 'request_id', 'response'], allowed_signup_domains: ['domain', 'active'],
    whitelisted_email_addresses: ['email', 'active'], images: ['image_url', 'context', 'created_by', 'selected_caption_id'],
};

const fieldExamples: Record<string, string> = {
    domain: 'Example: columbia.edu',
    email: 'Example: student@columbia.edu',
    base_url: 'Example: https://api.example.com/v1',
    secret_env_var: 'Example: GEMINI_API_KEY or OPENAI_API_KEY',
    step_key: 'Example: vision_analysis or caption_generation',
    prompt_template: 'Use {image}, {description}, and {context} placeholders as appropriate.',
    max_tokens: 'Example: 220',
    max_output_chars: 'Example: 1200',
    temperature: 'Example: 0.7',
    thinking_budget: 'Example: 0',
    model_id: 'Optional model UUID override',
    model_key: 'Example: gemini-2.5-flash',
    provider_id: 'Select the provider that owns this model.',
    chain_id: 'Example: UUID of an existing prompt chain',
    request_id: 'Example: UUID of an existing generation request',
    image_url: 'Example: https://images.example.com/photo.jpg',
    created_by: 'Example: UUID of the profile owner',
    selected_caption_id: 'Example: UUID of the selected caption',
    step_order: 'Example: 1',
    weight: 'Example: 1',
    status: 'Example: pending, completed, or failed',
    context: 'Example: Columbia campus or NYC context for the caption.',
    prompt: 'Example: Describe the image in two factual sentences.',
    input: 'Example: A photo of a student crossing campus.',
    output: 'Example: A generated caption or model output.',
    response: 'Example: The raw response returned by the provider.',
};

const fieldDisplayNames: Record<string, string> = {
    name: 'Name',
    description: 'Description',
    active: 'Active',
    prompt: 'Prompt',
    step_order: 'Step order',
    chain_id: 'Chain ID',
    term: 'Term',
    definition: 'Definition',
    status: 'Status',
    provider: 'Provider',
    model: 'Model',
    input: 'Input',
    output: 'Output',
    model_key: 'Model key',
    provider_id: 'Provider',
    base_url: 'Base URL',
    secret_env_var: 'API key variable',
    step_key: 'Step key',
    display_name: 'Display name',
    prompt_template: 'Prompt template',
    max_tokens: 'Max tokens',
    max_output_chars: 'Max output characters',
    temperature: 'Temperature',
    thinking_budget: 'Thinking budget',
    model_id: 'Model override',
    request_id: 'Request ID',
    response: 'Response',
    domain: 'Domain',
    email: 'Email address',
    image_url: 'Image URL',
    context: 'Context',
    created_by: 'Created by',
    selected_caption_id: 'Selected caption ID',
    weight: 'Weight',
};

function value(row: Record<string, unknown>, field: string) {
    if (field === 'term') return row.term ?? '';
    if (field === 'definition') return row.definition ?? '';
    if (field === 'email') return row.email ?? '';
    if (field === 'domain') return row.domain ?? '';
    if (field === 'prompt') return row.prompt ?? '';
    if (field === 'input') return row.input ?? '';
    if (field === 'output') return row.output ?? '';
    if (field === 'response') return row.response ?? '';
    if (field === 'image_url') return row.image_url ?? '';
    return row[field] ?? '';
}

const multilineFields = new Set(['description', 'definition', 'prompt', 'input', 'output', 'response', 'context', 'prompt_template']);

export default function OperationControls({ resource, rows, providers = [], canEdit }: { resource: OperationResource; rows: Record<string, unknown>[]; providers?: { id: string; name: string }[]; canEdit: boolean }) {
    const fields = fieldLabels[resource];
    const router = useRouter();
    const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
    const [showForm, setShowForm] = useState(false);
    async function submit(formData: FormData) {
        if (editing) await updateOperation(resource, String(editing.id), formData);
        else await createOperation(resource, formData);
        setEditing(null);
        setShowForm(false);
    }
    return <><div className="table-scroll"><table><thead><tr><th>Record ID</th>{fields.map((field) => <th key={field}>{fieldDisplayNames[field] ?? field}</th>)}{canEdit && <th>Actions</th>}</tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)}><td className="id-cell operation-id-cell">{String(row.id || '—')}</td>{fields.map((field) => <td key={field} className="operation-cell">{field === 'image_url' && value(row, field) ? <img className="operation-image-preview" src={String(value(row, field))} alt="" /> : field === 'active' ? <span className={`status-pill ${row.active === false ? 'status-pill-muted' : 'status-pill-success'}`}>{row.active === false ? 'Inactive' : 'Active'}</span> : String(value(row, field) || '—')}</td>)}{canEdit && <td><div className="actions"><button className="button button-small" type="button" onClick={() => { setEditing(row); setShowForm(true); }}>Edit</button><button className="button button-small button-danger" type="button" onClick={async () => { await deleteOperation(resource, String(row.id)); router.refresh(); }}>Delete</button></div></td>}</tr>)}</tbody></table></div>
        {!canEdit && <p className="muted operation-readonly-note">Read-only resource: records are captured by the application and cannot be changed here.</p>}
        {canEdit && !showForm && <button className="button operation-create-button" type="button" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add {OPERATION_LABELS[resource].replace(/s$/, '')}</button>}
        {canEdit && showForm && <form className="operation-form" key={String(editing?.id ?? 'new')} action={submit}><h3>{editing ? `Edit ${OPERATION_LABELS[resource].replace(/s$/, '')}` : `Add ${OPERATION_LABELS[resource].replace(/s$/, '')}`}</h3><div className="form-grid">{fields.map((field) => <label key={field}>{fieldDisplayNames[field] ?? field}{field === 'active' ? <select name={field} defaultValue={String(value(editing ?? {}, field) || true)}><option value="true">Active</option><option value="false">Inactive</option></select> : resource === 'llm_models' && field === 'provider_id' ? <select name={field} defaultValue={String(value(editing ?? {}, field))}><option value="">No provider selected</option>{providers.map((provider) => <option value={provider.id} key={provider.id}>{provider.name}</option>)}</select> : multilineFields.has(field) ? <textarea name={field} defaultValue={String(value(editing ?? {}, field))} placeholder={fieldExamples[field]} required={['description', 'definition', 'prompt', 'input', 'output', 'response'].includes(field)} /> : <input name={field} type="text" defaultValue={String(value(editing ?? {}, field))} placeholder={fieldExamples[field]} required={['name', 'term', 'domain', 'email', 'image_url', 'model_key'].includes(field)} />}{fieldExamples[field] && <span className="muted form-help">{fieldExamples[field]}</span>}</label>)}</div><p className="muted form-help">{resource === 'llm_models' ? 'The model key must exactly match the identifier accepted by the selected provider.' : resource === 'allowed_signup_domains' || resource === 'whitelisted_email_addresses' ? 'Inactive entries remain available for audit history but are not used for new signups.' : 'Changes are protected by superadmin access and apply to future application activity.'}</p><div className="actions"><button className="button" type="submit">{editing ? 'Save changes' : 'Create record'}</button><button className="button button-secondary" type="button" onClick={() => { setEditing(null); setShowForm(false); }}>Cancel</button></div></form>}</>;
}
