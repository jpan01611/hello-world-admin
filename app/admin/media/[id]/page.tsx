import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticated } from '@/lib/auth';
import { updateMedia } from '@/lib/admin-actions';
import MediaForm from '../MediaForm';
import { selectFeedCaption } from '@/lib/feed-selection';
import GenerateAdditionalCaptionButton from '../GenerateAdditionalCaptionButton';

export default async function EditMediaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { supabase, profile } = await requireAuthenticated();
    const isSuperadmin = profile?.is_superadmin === true;
    const isCaptionlessImage = id.startsWith('image-');
    const captionId = isCaptionlessImage ? null : id;
    const { data: media } = captionId
        ? await supabase.from('captions')
            .select('id, image_id, created_by, description, caption, vision_prompt, caption_prompt, created_at')
            .eq('id', id)
            .maybeSingle()
        : { data: null };
    const { data: placeholderImage } = isCaptionlessImage
        ? await supabase.from('images').select('id, image_url, created_by, created_at, selected_caption_id, context').eq('id', id.slice('image-'.length)).maybeSingle()
        : { data: null };
    if (!media && !placeholderImage) notFound();
    const imageId = media?.image_id ?? placeholderImage?.id;
    const ownerId = media?.created_by ?? placeholderImage?.created_by;
    const [{ data: image }, { data: owner }, { data: loadedVotes }, { data: siblingCaptions }] = await Promise.all([
        imageId && !placeholderImage ? supabase.from('images').select('image_url, selected_caption_id, created_by, context').eq('id', imageId).maybeSingle() : Promise.resolve({ data: placeholderImage }),
        ownerId ? supabase.from('profiles').select('first_name, last_name, id, avatar_url, is_superadmin').eq('id', ownerId).maybeSingle() : Promise.resolve({ data: null }),
        captionId ? supabase.from('votes').select('id, value, user_id, created_at').eq('caption_id', captionId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        imageId ? supabase.from('captions').select('id, created_at').eq('image_id', imageId) : Promise.resolve({ data: [] }),
    ]);
    const voteRows = loadedVotes ?? [];
    const score = voteRows.reduce((sum, vote) => sum + vote.value, 0);
    const siblingIds = (siblingCaptions ?? []).map((caption) => caption.id);
    const { data: siblingVotes } = siblingIds.length
        ? await supabase.from('votes').select('caption_id, value').in('caption_id', siblingIds)
        : { data: [] };
    const siblingScores = new Map<string, number>();
    for (const vote of siblingVotes ?? []) siblingScores.set(vote.caption_id, (siblingScores.get(vote.caption_id) ?? 0) + vote.value);
    const feedCaptionId = selectFeedCaption((siblingCaptions ?? []).map((caption) => ({
        ...caption,
        score: siblingScores.get(caption.id) ?? 0,
    })), image?.selected_caption_id ?? null);
    const imageOwnerId = image?.created_by ?? ownerId;
    const imageOwnerName = imageOwnerId === ownerId ? [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') || 'Unknown' : imageOwnerId;
    const captionIsMissing = !media?.caption?.trim();
    return <><header className="header"><div><p className="muted">AI Media</p><h1>{isCaptionlessImage ? 'Media details' : 'Edit media'}</h1></div><Link className="button secondary" href="/admin/media">Back</Link></header>
        <section className="panel media-detail"><div className="detail-grid"><div>{image?.image_url && <img className="detail-image" src={image.image_url} alt="Source media" />}</div><div>
            <h2>Media details</h2><p><strong>Caption:</strong> <span className={captionIsMissing ? 'is-placeholder' : undefined}>{captionIsMissing ? 'No caption available' : media?.caption}</span></p>{media?.description && <p><strong>Photo description:</strong> {media.description}</p>}<p><strong>Image owner:</strong> {imageOwnerName}</p><p><strong>Image owner ID:</strong> {imageOwnerId}</p>{media && <p><strong>Caption creator:</strong> {media.created_by}</p>}{image?.context && <p><strong>Creator context:</strong> {image.context}</p>}<p><strong>Review guidance:</strong> Keep Columbia references only when they are natural, accurate, and supported by the photo or context.</p><p><strong>Score:</strong> {score} from {voteRows.length} votes</p><p><strong>Show in feed:</strong> <span className={`feed-status ${feedCaptionId === media?.id ? 'is-shown' : 'is-hidden'}`}>{feedCaptionId === media?.id ? 'Yes' : 'No'}</span></p><p><strong>Created:</strong> {media?.created_at ? new Date(media.created_at).toLocaleString() : placeholderImage?.created_at ? new Date(placeholderImage.created_at).toLocaleString() : '—'}</p>
        </div></div>{media && isSuperadmin && <><div className="detail-actions"><GenerateAdditionalCaptionButton captionId={id} /></div><h2>Edit stored content</h2><MediaForm action={updateMedia.bind(null, id)} media={{ ...media, image_url: image?.image_url ?? '' }} /></>}
        <h2>Votes</h2><div className="table-scroll"><table><thead><tr><th>Value</th><th>Voter ID</th><th>Created</th></tr></thead><tbody>{voteRows.map((vote) => <tr key={vote.id}><td>{vote.value > 0 ? 'Upvote' : 'Downvote'}</td><td>{vote.user_id}</td><td>{vote.created_at ? new Date(vote.created_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div></section></>;
}
