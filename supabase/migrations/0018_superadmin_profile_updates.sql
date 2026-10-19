drop policy if exists "Superadmins can update profiles" on public.profiles;
create policy "Superadmins can update profiles"
on public.profiles for update to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());
