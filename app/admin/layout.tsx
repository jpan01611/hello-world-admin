import Link from 'next/link';
import { requireAuthenticated } from '@/lib/auth';
import { signOut } from '@/lib/admin-actions';
import { OPERATION_LABELS, OPERATION_RESOURCES } from '@/lib/operations';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const { user, profile } = await requireAuthenticated();
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email || 'User';
    const isSuperadmin = profile?.is_superadmin === true;
    return <div className="shell">
        <aside className="sidebar">
            <div className="brand-mark"><span>F</span><div><strong>FunFunFunSahur</strong><small>ADMIN CONSOLE</small></div></div>
            <nav className="nav" aria-label="Admin navigation">
                <p className="nav-label">Workspace</p>
                <Link href="/admin"><span className="nav-icon">⌂</span>Overview</Link>
                <p className="nav-label">Manage</p>
                <Link href="/admin/users"><span className="nav-icon">♙</span>Users</Link>
                <details className="nav-tree" open>
                    <summary><span className="nav-icon">▧</span><span>AI Media</span><span className="nav-tree-chevron">▾</span></summary>
                    <div className="nav-tree-items">
                        <Link href="/admin/media"><span className="nav-tree-branch">└</span>Media library</Link>
                        <Link href="/admin/ratings"><span className="nav-tree-branch">└</span>Ratings</Link>
                        <Link href="/admin/operations?resource=images"><span className="nav-tree-branch">└</span>Images table</Link>
                    </div>
                </details>
                <details className="nav-tree" open>
                    <summary><span className="nav-icon">◌</span><span>Operations</span><span className="nav-tree-chevron">▾</span></summary>
                    <div className="nav-tree-items">
                        {OPERATION_RESOURCES.filter((resource) => resource !== 'images').map((resource) => <Link href={`/admin/operations?resource=${resource}`} key={resource}><span className="nav-tree-branch">└</span>{OPERATION_LABELS[resource]}</Link>)}
                    </div>
                </details>
            </nav>
            <div className="sidebar-footer"><Link className="user-chip" href={`/admin/users/${user.id}`} aria-label="Open your profile"><span>{name.charAt(0).toUpperCase()}</span><div><strong>{name}</strong><small>{isSuperadmin ? 'Superadmin' : 'User'}</small></div></Link><form action={signOut}><button className="signout" type="submit">Sign out</button></form></div>
        </aside>
        <div className="workspace"><header className="topbar"><div className="top-search">⌕ <span>Search admin workspace</span><kbd>⌘ K</kbd></div><div className="top-actions"><span className="status-dot" title="Connected" /><span className="avatar">{name.charAt(0).toUpperCase()}</span></div></header><main className="main">{children}</main></div>
    </div>;
}
