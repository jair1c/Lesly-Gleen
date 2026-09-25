create table if not exists public.guest_photos (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 180),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 6291456),
  width integer not null check (width between 640 and 12000),
  height integer not null check (height between 640 and 12000),
  sha256 text,
  caption text check (caption is null or char_length(caption) <= 180),
  status text not null default 'uploading' check (status in ('uploading', 'pending', 'approved', 'rejected')),
  uploaded_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_photos_invitation_idx on public.guest_photos(invitation_id);
create index if not exists guest_photos_status_created_idx on public.guest_photos(status, created_at desc);
create unique index if not exists guest_photos_sha256_unique on public.guest_photos(sha256) where sha256 is not null;

alter table public.guest_photos enable row level security;
revoke all on table public.guest_photos from anon, authenticated;
grant select, insert, update, delete on table public.guest_photos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-uploads',
  'wedding-uploads',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.guest_photos is 'Fotografías privadas enviadas por invitados y moderadas antes de aparecer en la galería pública.';
