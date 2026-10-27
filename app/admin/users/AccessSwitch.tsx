'use client';

import { useFormStatus } from 'react-dom';
import { setUserRole } from '@/lib/admin-actions';

function RoleButton({ role, disabled }: { role: string; disabled: boolean }) {
    const { pending } = useFormStatus();
    return <select name="role" defaultValue={role} aria-label="User role" disabled={pending || disabled} onClick={(event) => event.stopPropagation()} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="member">Member</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select>;
}

export default function AccessSwitch({ userId, role, disabled = false }: { userId: string; role: string; disabled?: boolean }) {
    return <form className="access-control" action={setUserRole} onClick={(event) => event.stopPropagation()}>
        <input type="hidden" name="user_id" value={userId} />
        <RoleButton role={role} disabled={disabled} />
    </form>;
}
