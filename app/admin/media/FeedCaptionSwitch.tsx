'use client';

import { useFormStatus } from 'react-dom';
import { setCaptionShownInFeed } from '@/lib/admin-actions';

function SubmitButton({ enabled }: { enabled: boolean }) {
    const { pending } = useFormStatus();
    return <button className={`access-switch ${enabled ? 'is-on' : ''}`} type="submit" role="switch" aria-checked={enabled} aria-label={pending ? 'Saving feed selection' : enabled ? 'Remove caption from feed' : 'Show caption in feed'} disabled={pending}>
        <span className="access-switch-thumb" />
    </button>;
}

export default function FeedCaptionSwitch({ captionId, enabled }: { captionId: string; enabled: boolean }) {
    return <form className="access-control" action={setCaptionShownInFeed} onClick={(event) => event.stopPropagation()}>
        <input type="hidden" name="caption_id" value={captionId} />
        <input type="hidden" name="shown_in_feed" value={String(!enabled)} />
        <SubmitButton enabled={enabled} />
        <span className="access-label">{enabled ? 'Shown in feed' : 'Not shown in feed'}</span>
    </form>;
}
