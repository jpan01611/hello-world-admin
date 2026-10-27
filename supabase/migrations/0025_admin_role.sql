alter table public.profiles
  add column if not exists role text not null default 'member';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('member', 'admin', 'superadmin'));

update public.profiles
set role = 'superadmin'
where is_superadmin = true;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'member');
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

drop policy if exists "Admins can create own images" on public.images;
create policy "Admins can create own images"
on public.images for insert to authenticated
with check (created_by = auth.uid() and public.current_role() in ('admin', 'superadmin'));

drop policy if exists "Admins can create own captions" on public.captions;
create policy "Admins can create own captions"
on public.captions for insert to authenticated
with check (created_by = auth.uid() and public.current_role() in ('admin', 'superadmin'));

drop policy if exists "Admins can upload admin images" on storage.objects;
create policy "Admins can upload admin images"
on storage.objects for insert to authenticated
with check (bucket_id = 'images' and public.current_role() in ('admin', 'superadmin'));
