'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';

export default function MediaFilters({ initialQuery = '', initialQueryField, initialOwner, initialFeed, initialScore, initialSort, owners }: { initialQuery?: string; initialQueryField: string; initialOwner: string; initialFeed: string; initialScore: string; initialSort: string; owners: { id: string; name: string }[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(initialQuery);
    const [queryField, setQueryField] = useState(['caption', 'caption_id', 'owner_name'].includes(initialQueryField) ? initialQueryField : 'caption');
    const [owner] = useState(initialOwner);
    const [feed] = useState(initialFeed);
    const [score] = useState(initialScore);
    const [sort] = useState(initialSort);
    const [isPending, startTransition] = useTransition();
    const currentSearch = searchParams.toString();

    function updateFilter(name: string, value: string, defaultValue: string) {
        const params = new URLSearchParams(currentSearch);
        if (value === defaultValue) params.delete(name);
        else params.set(name, value);
        const next = params.toString();
        startTransition(() => router.replace(`${pathname}${next ? `?${next}` : ''}` as Route));
    }

    function applyQuery(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextQuery = query.trim();
        if (!nextQuery) return;
        const params = new URLSearchParams(currentSearch);
        params.set('q', nextQuery);
        params.set('qField', queryField);
        startTransition(() => router.replace(`${pathname}?${params.toString()}` as Route));
    }

    return <div className="toolbar">
        <form className={`query-control${isPending ? ' is-searching' : ''}`} onSubmit={applyQuery}><span className="query-icon">⌕</span><select value={queryField} onChange={(event) => setQueryField(event.target.value)} aria-label="Search field"><option value="owner_name">Owner name</option><option value="caption_id">Caption ID</option><option value="caption">Caption keywords</option><option value="description">Photo description</option><option value="context">Creator context</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={queryField === 'caption' ? 'Search captions…' : queryField === 'owner_name' ? 'Search owner names…' : queryField === 'description' ? 'Search photo descriptions…' : queryField === 'context' ? 'Search creator context…' : 'Enter a caption ID…'} aria-label="Search media" /></form>
        <label className="filter-select"><span>Owner</span><select value={owner} onChange={(event) => updateFilter('owner', event.target.value, '')} aria-label="Filter by owner"><option value="">All owners</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="filter-select"><span>Feed status</span><select value={feed} onChange={(event) => updateFilter('feed', event.target.value, 'all')} aria-label="Filter by shown in feed"><option value="all">All</option><option value="yes">Shown in feed</option><option value="no">Not shown in feed</option></select></label>
        <label className="filter-select"><span>Score</span><select value={score} onChange={(event) => updateFilter('score', event.target.value, 'all')} aria-label="Filter by score"><option value="all">All scores</option><option value="positive">Positive</option><option value="zero">Zero</option><option value="negative">Negative</option></select></label>
        <label className="filter-select"><span>Date created</span><select value={sort} onChange={(event) => updateFilter('sort', event.target.value, 'newest')} aria-label="Sort by date created"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    </div>;
}
