-- Foto profil agen/mitra untuk dashboard dan halaman publik.
alter table public.agents add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('agent-photos', 'agent-photos', true)
on conflict (id) do update set public = true;

create policy "Public can view agent photos"
on storage.objects for select
using (bucket_id = 'agent-photos');

create policy "Authenticated users can upload agent photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'agent-photos');

create policy "Authenticated users can update agent photos"
on storage.objects for update to authenticated
using (bucket_id = 'agent-photos')
with check (bucket_id = 'agent-photos');

create policy "Authenticated users can delete agent photos"
on storage.objects for delete to authenticated
using (bucket_id = 'agent-photos');
