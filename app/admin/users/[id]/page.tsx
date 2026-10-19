import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuthenticated } from '@/lib/auth';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { supabase } = await requireAuthenticated();
    const { data: user, error } = await supabase.from('profiles')
        .select('id, first_name, last_name, avatar_url, is_superadmin')
        .eq('id', id)
        .maybeSingle();
    if (error) throw new Error(`Unable to load user: ${error.message}`);
    if (!user) notFound();
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
    return <><header className="header"><div><p className="muted">Directory</p><h1>User details</h1></div><Link className="button secondary" href="/admin/users">Back</Link></header>
        <section className="panel media-detail"><div className="detail-grid"><div>{user.avatar_url ? <img className="detail-image" src={user.avatar_url} alt={`${name || 'User'} profile picture`} /> : <span className="user-avatar avatar-placeholder detail-avatar" aria-label="No profile picture">{initials}</span>}</div><div>
            <h2>{name || 'Unnamed user'}</h2><p><strong>Profile ID:</strong> {user.id}</p><p><strong>Access:</strong> <span className={`feed-status ${user.is_superadmin ? 'is-shown' : 'is-hidden'}`}>{user.is_superadmin ? 'Superadmin' : 'Standard'}</span></p>
        </div></div></section></>;
}
