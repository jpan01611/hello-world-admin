import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireAuthenticated() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, is_superadmin')
        .eq('id', user.id)
        .maybeSingle();

    return { supabase, user, profile };
}

export async function requireSuperadmin() {
    const result = await requireAuthenticated();
    const { profile } = result;

    if (!profile?.is_superadmin) redirect('/unauthorized');
    return { ...result, profile };
}
