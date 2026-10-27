import Link from 'next/link';
import { requireMediaAdmin } from '@/lib/auth';
import { generateMedia } from '@/lib/admin-actions';
import GenerateMediaForm from '../GenerateMediaForm';

export default async function NewMediaPage() {
    const { supabase, user, profile } = await requireMediaAdmin();
    const { data: profiles, error } = profile.role === 'superadmin'
        ? await supabase.from('profiles').select('id, first_name, last_name').order('first_name').limit(100)
        : { data: [], error: null };
    if (error) throw new Error(`Unable to load image owners: ${error.message}`);
    return <><header className="header"><h1>New AI media</h1></header>
        <section className="panel"><GenerateMediaForm action={generateMedia} profiles={profiles ?? []} currentUserId={user.id} isSuperadmin={profile.role === 'superadmin' || profile.is_superadmin === true}>
            <Link className="button secondary" href="/admin/media">Cancel</Link>
        </GenerateMediaForm></section></>;
}
