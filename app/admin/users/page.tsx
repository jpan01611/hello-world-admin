import Link from 'next/link';
import type { Route } from 'next';
import { requireAuthenticated } from '@/lib/auth';
import UserFilters from './UserFilters';
import ClickableTableRow from '../ClickableTableRow';
import AccessSwitch from './AccessSwitch';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; qField?: string; role?: string }> }) {
    const { supabase, user: currentUser, profile } = await requireAuthenticated();
    const isSuperadmin = profile?.is_superadmin === true;
    const params = await searchParams;
    const query = params.q?.trim() ?? '';
    const queryField = params.qField === 'id' ? 'id' : 'name';
    const roleFilter = params.role === 'superadmin' || params.role === 'standard' ? params.role : 'all';
    let usersQuery = supabase.from('profiles')
        .select('id, first_name, last_name, avatar_url, is_superadmin')
        .order('id', { ascending: true }).limit(100);
    if (query && queryField === 'name') usersQuery = usersQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
    if (roleFilter === 'superadmin') usersQuery = usersQuery.eq('is_superadmin', true);
    if (roleFilter === 'standard') usersQuery = usersQuery.eq('is_superadmin', false);
    const { data: loadedUsers, error } = await usersQuery;
    if (error) throw new Error(`Unable to load users: ${error.message}`);
    const users = query && queryField === 'id'
        ? (loadedUsers ?? []).filter((user) => user.id.toLowerCase().includes(query.toLowerCase()))
        : loadedUsers;
    const hasFilters = Boolean(query || roleFilter !== 'all');
    return <><header className="header"><div><p className="eyebrow">Manage / Directory</p><h1>User management</h1><p className="page-subtitle">Browse profiles and review administrator access.</p></div></header><section className="panel"><UserFilters key={`${query}|${queryField}|${roleFilter}`} initialQuery={query} initialQueryField={queryField} initialRole={roleFilter} />{hasFilters && <div className="filter-actions"><div className="active-filters"><span className="filter-summary-label">Filters</span>{query && <a className="filter-chip filter-chip-removable" href={`/admin/users${roleFilter !== 'all' ? `?role=${roleFilter}` : ''}`}><span>{queryField === 'id' ? 'Profile ID' : 'Name keywords'}: {query}</span><span className="filter-chip-remove" aria-label="Remove search filter">×</span></a>}{roleFilter !== 'all' && <a className="filter-chip filter-chip-removable" href={query ? `/admin/users?q=${encodeURIComponent(query)}&qField=${queryField}` : '/admin/users'}><span>Access: {roleFilter === 'superadmin' ? 'Superadmins' : 'Standard users'}</span><span className="filter-chip-remove" aria-label="Remove access filter">×</span></a>}<span className="result-count">{users?.length ?? 0} results</span></div></div>}<div className="table-scroll users-table-scroll"><table className="users-table"><colgroup><col className="users-col-avatar" /><col className="users-col-name" /><col className="users-col-id" />{isSuperadmin && <col className="users-col-role" />}</colgroup>
        <thead><tr><th>Avatar</th><th>Name</th><th>Profile ID</th>{isSuperadmin && <th>Access</th>}</tr></thead>
        <tbody>{users?.map((user) => {
            const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
            const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
            const userHref = `/admin/users/${user.id}` as Route;
            return <ClickableTableRow key={user.id} href={userHref}>
                <td><Link className="table-link table-cell-link" href={userHref}>{user.avatar_url ? <img className="user-avatar" src={user.avatar_url} alt={`${name || 'User'} avatar`} /> : <span className="user-avatar avatar-placeholder" aria-label="No profile picture">{initials}</span>}</Link></td>
                <td><Link className="table-link table-cell-link" href={userHref}>{name || <span className="is-placeholder">Unnamed user</span>}</Link></td>
                <td className="id-cell"><Link className="table-link table-cell-link" href={userHref}>{user.id}</Link></td>
                {isSuperadmin && <td>{user.id === currentUser.id ? <span className="access-label">Superadmin</span> : <AccessSwitch userId={user.id} enabled={user.is_superadmin} />}</td>}
            </ClickableTableRow>;
        })}</tbody>
    </table></div>{!users?.length && <p className="muted">There are no profiles matching these filters.</p>}</section></>;
}
