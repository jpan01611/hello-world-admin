import { requireAuthenticated } from '@/lib/auth';

export default async function AdminDashboard() {
    const { supabase } = await requireAuthenticated();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const [profiles, images, captions, votes, recentVotes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('images').select('id', { count: 'exact', head: true }),
        supabase.from('captions').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('created_at').gte('created_at', weekStart.toISOString()),
    ]);
    const queryError = [profiles, images, captions, votes, recentVotes].find((result) => result.error)?.error;
    if (queryError) throw new Error(`Unable to load overview: ${queryError.message}`);
    const stats = [
        ['Profiles', profiles.count], ['Images', images.count],
        ['Generated captions', captions.count], ['Votes', votes.count],
    ];
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        return { key: date.toISOString().slice(0, 10), label: index === 6 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' }) };
    });
    const counts = new Map(days.map((day) => [day.key, 0]));
    for (const vote of recentVotes.data ?? []) {
        const key = vote.created_at?.slice(0, 10);
        if (key && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const weeklySharing = days.map((day) => ({ ...day, count: counts.get(day.key) ?? 0 }));
    const maxSharing = Math.max(...weeklySharing.map((day) => day.count), 1);
    const totalSharing = weeklySharing.reduce((total, day) => total + day.count, 0);
    const peakSharing = Math.max(...weeklySharing.map((day) => day.count));
    return <><header className="header"><div><p className="eyebrow">Workspace / Overview</p><h1>Admin overview</h1><p className="page-subtitle">A quick read on the content and activity in funfunfunsahur.</p></div></header>
        <section className="cards">{stats.map(([label, value]) => <article className="card" key={label as string}>
            <span className="muted">{label}</span><strong>{value ?? '—'}</strong>
        </article>)}</section>
        <section className="panel weekly-sharing"><div className="section-heading"><div><p className="eyebrow">Last 7 days</p><h2>Ratings activity</h2></div><div className="sharing-summary"><strong>{totalSharing}</strong><span>total ratings</span><span className="sharing-peak">Peak: {peakSharing}</span></div></div><div className="sharing-chart-shell"><div className="sharing-y-axis" aria-hidden="true"><span>{maxSharing}</span><span>{Math.ceil(maxSharing / 2)}</span><span>0</span></div><div className="sharing-chart" aria-label="Ratings activity for the last seven days">{weeklySharing.map((day) => <div className="sharing-day" key={day.key} title={`${day.label}: ${day.count} rating${day.count === 1 ? '' : 's'}`}><span className="sharing-count">{day.count}</span><div className="sharing-bar-track"><div className="sharing-bar" style={{ height: `${Math.max((day.count / maxSharing) * 100, day.count ? 8 : 2)}%` }} /></div><span className="sharing-label">{day.label}</span></div>)}</div></div></section></>;
}
