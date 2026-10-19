'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';

export default function UserFilters({ initialQuery, initialQueryField, initialRole }: { initialQuery: string; initialQueryField: string; initialRole: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(initialQuery);
    const [queryField, setQueryField] = useState(initialQueryField);
    const [role] = useState(initialRole);
    const [isPending, startTransition] = useTransition();
    const currentSearch = searchParams.toString();

    function updateRole(nextRole: string) {
        const params = new URLSearchParams(currentSearch);
        if (nextRole === 'all') params.delete('role'); else params.set('role', nextRole);
        const next = params.toString();
        startTransition(() => router.replace(`${pathname}${next ? `?${next}` : ''}` as Route));
    }

    function applyQuery() {
        const nextQuery = query.trim();
        const params = new URLSearchParams(currentSearch);
        if (nextQuery) {
            params.set('q', nextQuery);
            params.set('qField', queryField);
        } else {
            params.delete('q');
            params.delete('qField');
        }
        const next = params.toString();
        startTransition(() => router.replace(`${pathname}${next ? `?${next}` : ''}` as Route));
    }

    return <div className="toolbar">
        <div className={`query-control${isPending ? ' is-searching' : ''}`}><span className="query-icon">⌕</span><select value={queryField} onChange={(event) => setQueryField(event.target.value)} aria-label="Search field"><option value="name">Name keywords</option><option value="id">Profile ID</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyQuery(); } }} placeholder={queryField === 'name' ? 'Search names…' : 'Enter a profile ID…'} aria-label={queryField === 'name' ? 'Name keywords' : 'Profile ID'} /></div>
        <label className="filter-select"><span>Access</span><select value={role} onChange={(event) => updateRole(event.target.value)}><option value="all">All users</option><option value="superadmin">Superadmins</option><option value="standard">Standard users</option></select></label>
    </div>;
}
