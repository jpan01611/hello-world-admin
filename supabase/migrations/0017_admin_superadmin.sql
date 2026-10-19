alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_superadmin = true
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

drop policy if exists "Superadmins can read profiles" on public.profiles;
create policy "Superadmins can read profiles"
on public.profiles for select to authenticated using (public.is_superadmin());

drop policy if exists "Superadmins can read images" on public.images;
create policy "Superadmins can read images"
on public.images for select to authenticated using (public.is_superadmin());
drop policy if exists "Superadmins can manage images" on public.images;
create policy "Superadmins can manage images"
on public.images for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Superadmins can read captions" on public.captions;
create policy "Superadmins can read captions"
on public.captions for select to authenticated using (public.is_superadmin());
drop policy if exists "Superadmins can manage captions" on public.captions;
create policy "Superadmins can manage captions"
on public.captions for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Superadmins can read votes" on public.votes;
create policy "Superadmins can read votes"
on public.votes for select to authenticated using (public.is_superadmin());
