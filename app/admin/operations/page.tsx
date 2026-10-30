import { requireAuthenticated } from '@/lib/auth';
import { canManageOperation, OPERATION_LABELS, OPERATION_RESOURCES, type OperationResource } from '@/lib/operations';
import OperationControls from './OperationControls';
import OperationFilters from './OperationFilters';

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ resource?: string; q?: string; status?: string; provider?: string }> }) {
    const { supabase, profile } = await requireAuthenticated();
    const params = await searchParams;
    const requested = params.resource ?? 'prompt_chains';
    const selected: OperationResource = OPERATION_RESOURCES.includes(requested as OperationResource) ? requested as OperationResource : 'prompt_chains';
    const queryText = params.q?.trim().toLowerCase() ?? '';
    const supportsStatusFilter = selected === 'generation_requests';
    const supportsProviderFilter = selected === 'generation_requests' || selected === 'llm_responses';
    const statusFilter = supportsStatusFilter && ['pending', 'completed', 'failed'].includes(params.status ?? '') ? params.status! : '';
    const providerFilter = supportsProviderFilter ? params.provider?.trim().toLowerCase() ?? '' : '';
    let query = supabase.from(selected).select('*').limit(200);
    if (selected === 'prompt_chain_steps') query = query.order('step_order', { ascending: true });
    else if (selected === 'prompt_chain_mix') query = query.order('updated_at', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load ${OPERATION_LABELS[selected]}: ${error.message}`);
    const filteredRows = (data ?? []).filter((row) => {
        if (statusFilter && String(row.status ?? '').toLowerCase() !== statusFilter) return false;
        if (providerFilter && String(row.provider ?? '').toLowerCase() !== providerFilter) return false;
        if (!queryText) return true;
        return Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(queryText));
    });
    const { data: providers, error: providersError } = selected === 'llm_models' || selected === 'generation_requests' || selected === 'llm_responses'
        ? await supabase.from('llm_providers').select('id, name').order('name')
        : { data: [], error: null };
    if (providersError) throw new Error(`Unable to load LLM providers: ${providersError.message}`);
    const isSuperadmin = profile?.is_superadmin === true;
    const managed = canManageOperation(selected);
    return <><header className="header"><div><p className="eyebrow">Manage / Admin resources</p><h1>{OPERATION_LABELS[selected]}</h1><p className="page-subtitle">{managed ? 'Create, review, and maintain the configuration used by the student-facing app.' : 'Review this resource and its history. Changes are made by the application workflow.'}</p></div></header>
        <section className="panel operations-panel">
            <div className="section-heading"><div><p className="eyebrow">{managed ? 'Configuration' : 'Read-only history'}</p><h2>{OPERATION_LABELS[selected]}</h2></div><span className="result-count">{filteredRows.length} records</span></div>
            <OperationFilters initialQuery={params.q ?? ''} initialStatus={statusFilter} initialProvider={params.provider ?? ''} providerOptions={(providers ?? []).map((provider) => provider.name)} showStatus={supportsStatusFilter} showProvider={supportsProviderFilter} />
            <OperationControls resource={selected} rows={filteredRows} providers={providers ?? []} canEdit={isSuperadmin && managed} />
            {!filteredRows.length && <p className="empty-state">No {OPERATION_LABELS[selected].toLowerCase()} match the current filters.</p>}
        </section></>;
}
