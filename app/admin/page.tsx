import { requireAuthenticated } from '@/lib/auth';

type Period = 'week' | 'month' | 'year';

function periodStart(period: Period) {
    const start = new Date();
    if (period === 'year') start.setFullYear(start.getFullYear() - 1);
    else if (period === 'month') start.setMonth(start.getMonth() - 1);
    else start.setDate(start.getDate() - 6);
    return start;
}

function percentage(value: number, total: number) {
    return total ? Math.round((value / total) * 100) : 0;
}

function activityBuckets(period: Period, start: Date, now: Date) {
    const count = period === 'year' ? 12 : period === 'month' ? 5 : 7;
    return Array.from({ length: count }, (_, index) => {
        const date = new Date(start);
        if (period === 'year') date.setMonth(date.getMonth() + index);
        else if (period === 'month') date.setDate(date.getDate() + index * 7);
        else date.setDate(date.getDate() + index);
        return {
            key: `${period}-${index}`,
            label: period === 'year'
                ? date.toLocaleDateString(undefined, { month: 'short' })
                : period === 'month'
                    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : index === count - 1 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' }),
            count: 0,
        };
    }).map((bucket, index, buckets) => {
        const date = new Date(start);
        if (period === 'year') date.setMonth(date.getMonth() + index);
        else if (period === 'month') date.setDate(date.getDate() + index * 7);
        else date.setDate(date.getDate() + index);
        return { ...bucket, end: index === buckets.length - 1 ? now : (() => {
            const end = new Date(date);
            if (period === 'year') end.setMonth(end.getMonth() + 1);
            else if (period === 'month') end.setDate(end.getDate() + 7);
            else end.setDate(end.getDate() + 1);
            return end;
        })() };
    });
}

function Donut({ title, center, segments }: { title: string; center: string; segments: { label: string; value: number; color: string }[] }) {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    let offset = 0;
    const gradient = total
        ? segments.map((segment) => {
            const start = (offset / total) * 100;
            offset += segment.value;
            return `${segment.color} ${start}% ${(offset / total) * 100}%`;
        }).join(', ')
        : '#3b302b 0 100%';
    return <article className="donut-card"><div className="donut-heading"><div><p className="eyebrow">Breakdown</p><h2>{title}</h2></div><strong>{total}</strong></div><div className="donut-body"><div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }} aria-label={`${title}: ${center}`}><span>{center}</span></div><div className="donut-legend">{segments.map((segment) => <div className="donut-legend-row" key={segment.label}><span className="legend-swatch" style={{ background: segment.color }} /><span>{segment.label}</span><strong>{total ? `${percentage(segment.value, total)}%` : '0%'}</strong></div>)}</div></div></article>;
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
    const { supabase } = await requireAuthenticated();
    const requestedPeriod = (await searchParams).period;
    const period: Period = requestedPeriod === 'month' || requestedPeriod === 'year' ? requestedPeriod : 'week';
    const start = periodStart(period);
    const startIso = start.toISOString();
    const [profiles, images, captions, votes, recentVotes, recentCaptions, recentImages] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('images').select('id', { count: 'exact', head: true }),
        supabase.from('captions').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('value, created_at').gte('created_at', startIso),
        supabase.from('captions').select('id, created_at').gte('created_at', startIso),
        supabase.from('images').select('id, created_at').gte('created_at', startIso),
    ]);
    const queryError = [profiles, images, captions, votes, recentVotes, recentCaptions, recentImages].find((result) => result.error)?.error;
    if (queryError) throw new Error(`Unable to load overview: ${queryError.message}`);
    const stats = [
        ['Profiles', profiles.count], ['Images', images.count],
        ['Generated captions', captions.count], ['Votes', votes.count],
    ];
    const recentCaptionCount = recentCaptions.data?.length ?? 0;
    const recentImageCount = recentImages.data?.length ?? 0;
    const recentUpvotes = (recentVotes.data ?? []).filter((vote) => vote.value > 0).length;
    const recentDownvotes = (recentVotes.data ?? []).filter((vote) => vote.value < 0).length;
    const periodLabel = period === 'year' ? 'Last year' : period === 'month' ? 'Last month' : 'Last 7 days';
    const today = new Date();
    const buckets = activityBuckets(period, start, today);
    for (const vote of recentVotes.data ?? []) {
        const timestamp = vote.created_at ? new Date(vote.created_at).getTime() : 0;
        const bucket = buckets.find((candidate) => timestamp >= new Date(start).getTime() && timestamp < candidate.end.getTime());
        if (bucket) bucket.count += 1;
    }
    const maxSharing = Math.max(...buckets.map((bucket) => bucket.count), 1);
    const totalSharing = buckets.reduce((total, bucket) => total + bucket.count, 0);
    const peakSharing = Math.max(...buckets.map((bucket) => bucket.count));
    const chartWidth = 700;
    const plotOffset = 38;
    const plotWidth = chartWidth - plotOffset;
    const chartBaseline = 150;
    const chartHeight = 120;
    const halfScale = Math.ceil(maxSharing / 2);
    const scaleY = (value: number) => chartBaseline - (value / maxSharing) * chartHeight;
    const chartPoints = buckets.map((bucket, index) => {
        const x = plotOffset + (buckets.length === 1 ? plotWidth / 2 : (index / (buckets.length - 1)) * plotWidth);
        const y = scaleY(bucket.count);
        return { ...bucket, x, y };
    });
    const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
    const areaPoints = `${plotOffset},${chartBaseline} ${linePoints} ${chartWidth},${chartBaseline}`;
    return <><header className="header"><div><p className="eyebrow">Columbia student workspace</p><h1>Admin overview</h1><p className="page-subtitle">Review Columbia student-life media, captions, and community ratings.</p></div></header>
        <section className="cards">{stats.map(([label, value]) => <article className="card" key={label as string}>
            <span className="muted">{label}</span><strong>{value ?? '—'}</strong>
        </article>)}</section>
        <section className="overview-analytics"><section className="panel weekly-sharing"><div className="section-heading"><div className="sharing-title"><p className="eyebrow">{periodLabel}</p><h2>Ratings activity</h2></div><div className="sharing-controls"><div className="period-switcher" aria-label="Select ratings date range">{(['week', 'month', 'year'] as Period[]).map((option) => <a className={`button button-small ${period === option ? '' : 'button-secondary'}`} href={`/admin?period=${option}`} key={option}>{option === 'week' ? 'Last week' : option === 'month' ? 'Last month' : 'Last year'}</a>)}</div><div className="sharing-summary"><strong>{totalSharing}</strong><span>ratings in range</span><span className="sharing-peak">Peak: {peakSharing}</span></div></div></div><div className="chart-caption">Ratings per {period === 'week' ? 'day' : period === 'month' ? 'week' : 'month'}</div><div className="sharing-chart-shell"><div className="sharing-chart" role="img" aria-label={`Ratings activity for ${periodLabel.toLowerCase()}`}><svg className="sharing-line-chart" viewBox={`0 0 ${chartWidth} 178`} preserveAspectRatio="none"><line className="sharing-grid-line" x1={plotOffset} x2={chartWidth} y1={scaleY(maxSharing)} y2={scaleY(maxSharing)} /><line className="sharing-grid-line" x1={plotOffset} x2={chartWidth} y1={scaleY(halfScale)} y2={scaleY(halfScale)} /><line className="sharing-grid-line" x1={plotOffset} x2={chartWidth} y1={scaleY(0)} y2={scaleY(0)} /><text className="sharing-scale-label" x="30" y={scaleY(maxSharing)} dominantBaseline="middle" textAnchor="end">{maxSharing}</text><text className="sharing-scale-label" x="30" y={scaleY(halfScale)} dominantBaseline="middle" textAnchor="end">{halfScale}</text><text className="sharing-scale-label" x="30" y={scaleY(0)} dominantBaseline="middle" textAnchor="end">0</text><polygon className="sharing-area" points={areaPoints} /><polyline className="sharing-line" points={linePoints} fill="none" />{chartPoints.map((point) => <g key={point.key}><title>{`${point.label}: ${point.count} rating${point.count === 1 ? '' : 's'}`}</title><circle className="sharing-point" cx={point.x} cy={point.y} r="4" /><text className="sharing-value" x={point.x} y={Math.max(point.y - 10, 12)} textAnchor="middle">{point.count}</text></g>)}</svg><div className="sharing-x-labels">{chartPoints.map((point) => <span key={point.key} style={{ left: `${(point.x / chartWidth) * 100}%` }}>{point.label}</span>)}</div></div></div></section><div className="donut-grid"><Donut title="Rating sentiment" center={`${percentage(recentUpvotes, recentUpvotes + recentDownvotes)}% positive`} segments={[{ label: 'Upvotes', value: recentUpvotes, color: '#d8a85f' }, { label: 'Downvotes', value: recentDownvotes, color: '#a95850' }]} /><Donut title="Content created" center={`${recentCaptionCount + recentImageCount} items`} segments={[{ label: 'Captions', value: recentCaptionCount, color: '#8bb6a5' }, { label: 'Source images', value: recentImageCount, color: '#6f8db6' }]} /></div></section></>;
}
