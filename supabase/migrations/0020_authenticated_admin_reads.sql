drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles for select to authenticated
using (true);

drop policy if exists "Authenticated users can read images" on public.images;
create policy "Authenticated users can read images"
on public.images for select to authenticated
using (true);

drop policy if exists "Authenticated users can read captions" on public.captions;
create policy "Authenticated users can read captions"
on public.captions for select to authenticated
using (true);

drop policy if exists "Authenticated users can read votes" on public.votes;
create policy "Authenticated users can read votes"
on public.votes for select to authenticated
using (true);
