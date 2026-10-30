import Link from 'next/link';
import type { Route } from 'next';
import { requireAuthenticated } from '@/lib/auth';
import { selectFeedCaption } from '@/lib/feed-selection';
import MediaDeleteButton from './MediaDeleteButton';
import MediaFilters from './MediaFilters';
import ClickableTableRow from '../ClickableTableRow';
import FeedCaptionSwitch from './FeedCaptionSwitch';

type MediaCaption = {
    id: string;
    image_id: string;
    created_by: string;
    caption: string | null;
    description: string | null;
    vision_prompt: string | null;
    caption_prompt: string | null;
    created_at: string;
};
type MediaItem = MediaCaption;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; qField?: string; owner?: string; feed?: string; score?: string; sort?: string }> }) {
    const { supabase, user, profile } = await requireAuthenticated();
    const isSuperadmin = profile?.is_superadmin === true;
    const params = await searchParams;
    const query = params.q?.trim() ?? '';
    const queryField = ['caption', 'caption_id', 'owner_name', 'description', 'context'].includes(params.qField ?? '') ? params.qField! : 'caption';
    const ownerFilter = params.owner?.trim() ?? '';
    const feedFilter = params.feed === 'yes' || params.feed === 'no' ? params.feed : 'all';
    const scoreFilter = ['positive', 'zero', 'negative'].includes(params.score ?? '') ? params.score! : 'all';
    const sortOrder = params.sort === 'oldest' ? 'oldest' : 'newest';
    const { data: sourceImages, error: imagesError } = await supabase.from('images')
        .select('id, image_url, context, selected_caption_id, created_by, created_at')
        .order('created_at', { ascending: sortOrder === 'oldest' }).limit(100);
    if (imagesError) throw new Error(`Unable to load media images: ${imagesError.message}`);
    const imageIds = (sourceImages ?? []).map((image) => image.id);
    const captionsResult = imageIds.length
        ? await supabase.from('captions').select('id, image_id, created_by, caption, description, vision_prompt, caption_prompt, created_at').in('image_id', imageIds)
        : { data: [] as MediaCaption[], error: null };
    const captionRows = (captionsResult.data ?? []) as MediaCaption[];
    const captionsError = captionsResult.error;
    if (captionsError) throw new Error(`Unable to load media captions: ${captionsError.message}`);
    const captionsByImage = new Map<string, typeof captionRows>();
    for (const caption of captionRows ?? []) captionsByImage.set(caption.image_id, [...(captionsByImage.get(caption.image_id) ?? []), caption]);
    const media: MediaItem[] = (sourceImages ?? []).flatMap((image): MediaItem[] => {
        const captions = captionsByImage.get(image.id) ?? [];
        const matchingCaptions = query && queryField === 'caption'
            ? captions.filter((caption) => caption.caption?.toLowerCase().includes(query.toLowerCase()))
            : query && queryField === 'caption_id'
                ? captions.filter((caption) => caption.id.toLowerCase().includes(query.trim().toLowerCase()))
                : query && queryField === 'context'
                    ? captions.filter((caption) => (sourceImages?.find((image) => image.id === caption.image_id)?.context ?? '').toLowerCase().includes(query.toLowerCase()))
                : query && queryField === 'description'
                    ? captions.filter((caption) => caption.description?.toLowerCase().includes(query.toLowerCase()))
                : captions;
        if (matchingCaptions.length) return matchingCaptions;
        if (!query && captions.length === 0) return [{
            id: `image-${image.id}`,
            image_id: image.id,
            created_by: image.created_by,
            caption: null,
            description: null,
            vision_prompt: null,
            caption_prompt: null,
            created_at: image.created_at,
        }];
        return [];
    });
    const captionIds = (captionRows ?? []).map((item) => item.id);
    const ownerIds = [...new Set([
        ...(media ?? []).map((item) => item.created_by),
        ...(sourceImages ?? []).map((image) => image.created_by),
    ])];
    const [
        { data: votes, error: votesError },
        { data: owners, error: ownersError },
    ] = await Promise.all([
        captionIds.length ? supabase.from('votes').select('caption_id, value').in('caption_id', captionIds) : Promise.resolve({ data: [], error: null }),
        ownerIds.length ? supabase.from('profiles').select('id, first_name, last_name').in('id', ownerIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (votesError) throw new Error(`Unable to load media ratings: ${votesError.message}`);
    if (ownersError) throw new Error(`Unable to load media owners: ${ownersError.message}`);
    const imagesById = new Map((sourceImages ?? []).map((image) => [image.id, image]));
    const votesByCaption = new Map<string, { value: number }[]>();
    for (const vote of votes ?? []) votesByCaption.set(vote.caption_id, [...(votesByCaption.get(vote.caption_id) ?? []), vote]);
    const allScores = new Map<string, number>();
    for (const vote of votes ?? []) allScores.set(vote.caption_id, (allScores.get(vote.caption_id) ?? 0) + vote.value);
    const feedCaptionByImage = new Map<string, string | null>();
    for (const image of sourceImages ?? []) {
        const candidates = (captionsByImage.get(image.id) ?? []).map((caption) => ({
            ...caption,
            score: allScores.get(caption.id) ?? 0,
        }));
        feedCaptionByImage.set(image.id, selectFeedCaption(candidates, image.selected_caption_id));
    }
    const ownerNames = new Map((owners ?? []).map((owner) => [owner.id, [owner.first_name, owner.last_name].filter(Boolean).join(' ') || 'Unnamed']));
    const filteredMedia = (media ?? []).filter((item) => {
        if (ownerFilter) {
            const itemOwnerId = imagesById.get(item.image_id)?.created_by ?? item.created_by;
            if (itemOwnerId !== ownerFilter) return false;
        }
        if (query && queryField === 'owner_name') {
            const ownerId = imagesById.get(item.image_id)?.created_by ?? item.created_by;
            const ownerName = ownerNames.get(ownerId) ?? '';
            if (!ownerName.toLowerCase().includes(query.toLowerCase())) return false;
        }
        if (feedFilter === 'all') return true;
        const shownInFeed = feedCaptionByImage.get(item.image_id) === item.id;
        return feedFilter === 'yes' ? shownInFeed : !shownInFeed;
    }).filter((item) => {
        if (scoreFilter === 'all') return true;
        const score = (votesByCaption.get(item.id) ?? []).reduce((sum, vote) => sum + vote.value, 0);
        return scoreFilter === 'positive' ? score > 0 : scoreFilter === 'zero' ? score === 0 : score < 0;
    });
    const hasActionColumn = isSuperadmin || filteredMedia.some((item) => {
        const ownerId = imagesById.get(item.image_id)?.created_by ?? item.created_by;
        return !item.id.startsWith('image-') && ownerId === user.id;
    });
    const hasFilters = Boolean(query || ownerFilter || feedFilter !== 'all' || scoreFilter !== 'all' || sortOrder !== 'newest');
    const clearHref = '/admin/media';
    function filterHref(remove: string[]) {
        const next = new URLSearchParams();
        if (query && !remove.includes('q')) {
            next.set('q', query);
            next.set('qField', queryField);
        }
        if (feedFilter !== 'all' && !remove.includes('feed')) next.set('feed', feedFilter);
        if (ownerFilter && !remove.includes('owner')) next.set('owner', ownerFilter);
        if (scoreFilter !== 'all' && !remove.includes('score')) next.set('score', scoreFilter);
        if (sortOrder !== 'newest' && !remove.includes('sort')) next.set('sort', sortOrder);
        const queryString = next.toString();
        return `/admin/media${queryString ? `?${queryString}` : ''}` as Route;
    }
    const queryLabel = queryField === 'caption' ? 'Caption keywords' : queryField === 'caption_id' ? 'Caption ID' : queryField === 'owner_name' ? 'Owner name' : queryField === 'context' ? 'Creator context' : 'Photo description';
    const ownerOptions = (owners ?? []).map((owner) => ({ id: owner.id, name: ownerNames.get(owner.id) ?? 'Unnamed user' })).sort((a, b) => a.name.localeCompare(b.name));
    return <><header className="header"><div><p className="eyebrow">Manage / Columbia student content</p><h1>AI media library</h1><p className="page-subtitle">Review source photos, creator context, and captions for relevance, accuracy, and natural Columbia references.</p></div>{isSuperadmin && <Link className="button" href="/admin/media/new">+ New media</Link>}</header>
        <section className="panel"><MediaFilters key={`${query}|${queryField}|${ownerFilter}|${feedFilter}|${scoreFilter}|${sortOrder}`} initialQuery={query} initialQueryField={queryField} initialOwner={ownerFilter} initialFeed={feedFilter} initialScore={scoreFilter} initialSort={sortOrder} owners={ownerOptions} />{hasFilters && <div className="filter-actions"><div className="active-filters" aria-label="Active filters"><span className="filter-summary-label">Filters</span>{query && <Link className="filter-chip filter-chip-removable" href={filterHref(['q'])}><span>{queryLabel}: {query}</span><span className="filter-chip-remove" aria-label={`Remove ${queryLabel} filter`}>×</span></Link>}{ownerFilter && <Link className="filter-chip filter-chip-removable" href={filterHref(['owner'])}><span>Owner: {ownerNames.get(ownerFilter) ?? ownerFilter}</span><span className="filter-chip-remove" aria-label="Remove owner filter">×</span></Link>}{feedFilter !== 'all' && <Link className="filter-chip filter-chip-removable" href={filterHref(['feed'])}><span>Show in feed: {feedFilter === 'yes' ? 'Yes' : 'No'}</span><span className="filter-chip-remove" aria-label="Remove show in feed filter">×</span></Link>}{scoreFilter !== 'all' && <Link className="filter-chip filter-chip-removable" href={filterHref(['score'])}><span>Score: {scoreFilter}</span><span className="filter-chip-remove" aria-label="Remove score filter">×</span></Link>}{sortOrder !== 'newest' && <Link className="filter-chip filter-chip-removable" href={filterHref(['sort'])}><span>Created: Oldest first</span><span className="filter-chip-remove" aria-label="Remove date filter">×</span></Link>}<span className="result-count">{filteredMedia.length} results</span>        </div><Link className="clear-filter" href={clearHref}>Clear filters</Link></div>}
            <div className="table-scroll media-table-scroll"><table className="media-table"><colgroup><col className="media-col-id" /><col className="media-col-preview" /><col className="media-col-caption" /><col className="media-col-owner" /><col className="media-col-score" /><col className="media-col-vote" /><col className="media-col-downvote" /><col className="media-col-feed" /><col className="media-col-created" />{hasActionColumn && <col className="media-col-actions" />}</colgroup><thead><tr><th>Caption ID</th><th>Preview</th><th>Caption</th><th>Owner</th><th>Score</th><th>Upvotes</th><th>Downvotes</th><th>Show in feed</th><th>Created</th>{hasActionColumn && <th>Actions</th>}</tr></thead>
            <tbody>{filteredMedia.map((item) => {
                const image = imagesById.get(item.image_id);
                const itemVotes = votesByCaption.get(item.id) ?? [];
                const score = itemVotes.reduce((sum, vote) => sum + vote.value, 0);
                const upvotes = itemVotes.filter((vote) => vote.value > 0).length;
                const downvotes = itemVotes.filter((vote) => vote.value < 0).length;
                const shownInFeed = feedCaptionByImage.get(item.image_id) === item.id;
                const caption = item.caption?.trim() || 'No caption available';
                const isCaptionRecord = !item.id.startsWith('image-');
                const detailHref = `/admin/media/${item.id}` as Route;
                const ownerId = image?.created_by ?? item.created_by;
                const canSelectFeed = isSuperadmin || ownerId === user.id;
                const canDelete = isSuperadmin || ownerId === user.id;
                return <ClickableTableRow key={item.id} href={detailHref}><td className="id-cell"><Link className="table-link table-cell-link" href={detailHref}>{isCaptionRecord ? item.id : '—'}</Link></td><td><Link className="table-link table-cell-link" href={detailHref}>{image?.image_url ? <img className="media-preview" src={image.image_url} alt="" /> : '—'}</Link></td><td className={`caption-cell${item.caption?.trim() ? '' : ' is-placeholder'}`}><Link className="table-link table-cell-link" href={detailHref}>{caption}</Link></td><td className="owner-cell"><Link className="table-link table-cell-link" href={detailHref}>{ownerNames.get(ownerId) ?? ownerId}</Link></td><td><Link className="table-link table-cell-link" href={detailHref}>{score}</Link></td><td><Link className="table-link table-cell-link" href={detailHref}>{upvotes}</Link></td><td><Link className="table-link table-cell-link" href={detailHref}>{downvotes}</Link></td><td><div className="feed-table-control">{isCaptionRecord && canSelectFeed && <FeedCaptionSwitch captionId={item.id} enabled={shownInFeed} />}</div></td><td><Link className="table-link table-cell-link" href={detailHref}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</Link></td>{hasActionColumn && <td className="action-cell"><div className="actions">{isCaptionRecord && canDelete && <MediaDeleteButton id={item.id} />}</div></td>}</ClickableTableRow>;
            })}</tbody>
        </table></div>{!filteredMedia.length && <p className="muted">There are no media records matching these filters.</p>}</section></>;
}
