'use client';

import { useFormStatus } from 'react-dom';
import { setSuperadmin } from '@/lib/admin-actions';

function SwitchButton({ enabled }: { enabled: boolean }) {
    const { pending } = useFormStatus();
    return <button className={`access-switch ${enabled ? 'is-on' : ''}`} type="submit" role="switch" aria-checked={enabled} aria-label={pending ? 'Saving access' : enabled ? 'Revoke superadmin access' : 'Grant superadmin access'} disabled={pending}>
        <span className="access-switch-thumb" />
    </button>;
}

export default function AccessSwitch({ userId, enabled }: { userId: string; enabled: boolean }) {
    return <form className="access-control" action={setSuperadmin} onClick={(event) => event.stopPropagation()}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="is_superadmin" value={String(!enabled)} />
        <SwitchButton enabled={enabled} />
        <span className="access-label">{enabled ? 'Superadmin' : 'Standard'}</span>
    </form>;
}
