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

    return <main className="login">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <section className="login-card">
            <div className="login-brand"><span className="login-brand-mark">F</span><div><strong>FunFunFunSahur</strong><small>ADMIN CONSOLE</small></div></div>
            <div className="login-intro">
                <p className="eyebrow">Administrator access</p>
                <h1>Run your workspace<br /><em>with confidence.</em></h1>
                <p>Sign in to manage users, review media, monitor activity, and keep your community running smoothly.</p>
            </div>
            <button className="google-button" onClick={signIn} disabled={loading}>
                <span className="google-mark" aria-hidden="true">G</span>
                <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
                <span className="button-arrow" aria-hidden="true">→</span>
            </button>
            <p className="login-note">Secure access for authorized team members only.</p>
        </section>
        <p className="login-footer">FunFunFunSahur <span>•</span> Admin workspace</p>
    </main>;
}
