import { requireAuthenticated } from '@/lib/auth';
import { OPERATION_LABELS, OPERATION_RESOURCES, type OperationResource } from '@/lib/operations';
import OperationControls from './OperationControls';

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ resource?: string }> }) {
    const { supabase, profile } = await requireAuthenticated();
    const requested = (await searchParams).resource ?? 'prompt_chains';
    const selected: OperationResource = OPERATION_RESOURCES.includes(requested as OperationResource) ? requested as OperationResource : 'prompt_chains';
    let query = supabase.from(selected).select('*').limit(200);
    if (selected === 'prompt_chain_steps') query = query.order('step_order', { ascending: true });
    else if (selected === 'prompt_chain_mix') query = query.order('updated_at', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load ${OPERATION_LABELS[selected]}: ${error.message}`);
    const { data: providers, error: providersError } = selected === 'llm_models'
        ? await supabase.from('llm_providers').select('id, name').order('name')
        : { data: [], error: null };
    if (providersError) throw new Error(`Unable to load LLM providers: ${providersError.message}`);
    const isSuperadmin = profile?.is_superadmin === true;
    return <><header className="header"><div><p className="eyebrow">Manage / Observability</p><h1>Operations data</h1><p className="page-subtitle">Inspect prompt execution, model configuration, generated responses, and signup controls.</p></div></header>
        <section className="panel operations-panel">
            <div className="section-heading"><div><p className="eyebrow">Resource</p><h2>{OPERATION_LABELS[selected]}</h2></div><span className="result-count">{data?.length ?? 0} records</span></div>
            <OperationControls resource={selected} rows={data ?? []} providers={providers ?? []} canEdit={isSuperadmin} />
            {!data?.length && <p className="empty-state">No {OPERATION_LABELS[selected].toLowerCase()} are available yet. Create the first record to get started.</p>}
        </section></>;
}
