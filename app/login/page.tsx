'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);

    async function signIn() {
        setLoading(true);
        const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
        const appUrl = configuredAppUrl || window.location.origin;
        const redirectTo = new URL('/auth/callback', appUrl).toString();
        console.log('[funfunfunsahur OAuth] redirectTo:', redirectTo);
        const { error } = await createClient().auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: { prompt: 'select_account' },
            },
        });
        console.log('[funfunfunsahur OAuth] signInWithOAuth result:', error ?? 'redirect started');
        if (error) setLoading(false);
    }

    return <main className="login"><section className="panel">
        <p className="muted">funfunfunsahur</p>
        <h1>Sign in to continue</h1>
        <p className="muted">Google login is required.</p>
        <button className="button" onClick={signIn} disabled={loading}>
            {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
    </section></main>;
}
