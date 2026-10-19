'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';

export default function RatingFilters({ value }: { value: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const hasFilter = value !== 'all';

    function updateValue(nextValue: string) {
        const params = new URLSearchParams();
        if (nextValue !== 'all') params.set('value', nextValue);
        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ''}` as Route);
    }

    return <div className="rating-filter-bar">
        <label className="filter-select rating-filter-select">
            <span>Rating</span>
            <select value={value} onChange={(event) => updateValue(event.target.value)} aria-label="Filter ratings by value">
                <option value="all">All ratings</option>
                <option value="up">Upvotes</option>
                <option value="down">Downvotes</option>
            </select>
        </label>
        {hasFilter && <button className="clear-filter-button" type="button" onClick={() => updateValue('all')}>Clear filter</button>}
    </div>;
}
