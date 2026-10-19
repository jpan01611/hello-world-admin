drop policy if exists "Image owners can delete their captions" on public.captions;
create policy "Image owners can delete their captions"
on public.captions for delete to authenticated
using (
  exists (
    select 1 from public.images
    where images.id = captions.image_id
      and images.created_by = auth.uid()
  )
);

drop policy if exists "Image owners can delete their images" on public.images;
create policy "Image owners can delete their images"
on public.images for delete to authenticated
using (created_by = auth.uid());
