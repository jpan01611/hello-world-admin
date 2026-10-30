'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';

export default function OperationFilters({ initialQuery, initialStatus, initialProvider, providerOptions, showStatus, showProvider }: { initialQuery: string; initialStatus: string; initialProvider: string; providerOptions: string[]; showStatus: boolean; showProvider: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const current = useSearchParams();
    const [query, setQuery] = useState(initialQuery);
    const [isPending, startTransition] = useTransition();
    function update(name: string, value: string) {
        const params = new URLSearchParams(current.toString());
        if (value) params.set(name, value);
        else params.delete(name);
        startTransition(() => router.replace(`${pathname}?${params.toString()}` as Route));
    }
    return <div className="toolbar">
        <form className={`query-control${isPending ? ' is-searching' : ''}`} onSubmit={(event) => { event.preventDefault(); update('q', query.trim()); }}>
            <span className="query-icon">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inputs, outputs, prompts, or IDs…" aria-label="Search operations" />
        </form>
        {showStatus && <label className="filter-select"><span>Status</span><select value={initialStatus} onChange={(event) => update('status', event.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option></select></label>}
        {showProvider && <label className="filter-select"><span>Provider</span><select value={initialProvider} onChange={(event) => update('provider', event.target.value)}><option value="">All providers</option>{providerOptions.map((provider) => <option value={provider} key={provider}>{provider}</option>)}</select></label>}
    </div>;
}
