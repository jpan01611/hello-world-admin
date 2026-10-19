alter table public.images
  add column if not exists context text;

drop policy if exists "Superadmins can upload admin images" on storage.objects;
create policy "Superadmins can upload admin images"
on storage.objects for insert to authenticated
with check (bucket_id = 'images' and public.is_superadmin());

drop policy if exists "Superadmins can delete admin images" on storage.objects;
create policy "Superadmins can delete admin images"
on storage.objects for delete to authenticated
using (bucket_id = 'images' and public.is_superadmin());
