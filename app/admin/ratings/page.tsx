import { requireAuthenticated } from '@/lib/auth';
import RatingFilters from './RatingFilters';

export default async function RatingsPage({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    const { supabase } = await requireAuthenticated();
    const value = (await searchParams).value ?? 'all';
    const { data: ratings, error } = await supabase.from('votes')
        .select('id, value, created_at, user_id, caption_id').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(`Unable to load ratings: ${error.message}`);
    const filtered = ratings?.filter((rating) => value === 'all' || (value === 'up' ? rating.value > 0 : rating.value < 0));
    return <><header className="header"><div><p className="eyebrow">Manage / Engagement</p><h1>Ratings activity</h1><p className="page-subtitle">Read-only view of community votes across generated media.</p></div></header><section className="panel"><RatingFilters value={value} />{value !== 'all' && <div className="filter-actions"><div className="active-filters"><span className="filter-summary-label">Filters</span><a className="filter-chip filter-chip-removable" href="/admin/ratings"><span>Rating: {value === 'up' ? 'Upvotes' : 'Downvotes'}</span><span className="filter-chip-remove" aria-label="Remove rating filter">×</span></a></div></div>}<div className="table-scroll ratings-table-scroll"><table>
        <thead><tr><th>Rating</th><th>Voter ID</th><th>Caption ID</th><th>Created</th></tr></thead>
        <tbody>{filtered?.map((rating) => <tr key={rating.id}><td>{rating.value > 0 ? 'Upvote' : 'Downvote'}</td><td>{rating.user_id}</td><td>{rating.caption_id}</td><td>{rating.created_at ? new Date(rating.created_at).toLocaleDateString() : '—'}</td></tr>)}</tbody>
    </table></div>{!filtered?.length && <p className="muted">There are no ratings matching this filter.</p>}</section></>;
}
