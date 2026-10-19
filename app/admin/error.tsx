'use client';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <main className="error-state"><div className="panel"><p className="eyebrow">Admin console</p><h1>Something went wrong</h1><p className="muted">{error.message || 'The admin data could not be loaded. Please try again.'}</p><button className="button" type="button" onClick={() => reset()}>Try again</button></div></main>;
}
