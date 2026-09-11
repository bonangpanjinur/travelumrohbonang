-- Data administrasi agen/mitra: tanggal bergabung, materi identitas, MOU, dan masa berlaku.
alter table public.agents
  add column if not exists joined_at date,
  add column if not exists banner_id_card_url text,
  add column if not exists mou_number text,
  add column if not exists valid_until date;

comment on column public.agents.joined_at is 'Tanggal agen/mitra bergabung';
comment on column public.agents.banner_id_card_url is 'URL file banner atau ID card agen';
comment on column public.agents.mou_number is 'Nomor MOU agen/mitra';
comment on column public.agents.valid_until is 'Tanggal berakhir masa berlaku kerja sama';
