'use client';

import { useTransition } from 'react';
import { deleteMedia } from '@/lib/admin-actions';

export default function MediaDeleteButton({ id }: { id: string }) {
    const [pending, startTransition] = useTransition();
    return <button className="button danger" disabled={pending} onClick={() => {
        if (window.confirm('Delete this media and its related votes?')) startTransition(() => deleteMedia(id));
    }}>{pending ? 'Deleting...' : 'Delete'}</button>;
}
