create extension if not exists pgcrypto;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique,
  guest_name text not null check (char_length(guest_name) between 1 and 180),
  seats smallint not null check (seats between 1 and 20),
  expires_at date not null,
  active boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'attending', 'declined')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.invitations(id) on delete cascade,
  attendance boolean not null,
  attendee_count smallint not null default 0 check (attendee_count between 0 and 20),
  attendee_names text[] not null default '{}',
  message text check (message is null or char_length(message) <= 500),
  whatsapp_opened boolean not null default false,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invitations_status_idx on public.invitations(status);
create index if not exists invitations_expires_at_idx on public.invitations(expires_at);
create index if not exists rsvps_invitation_id_idx on public.rsvps(invitation_id);

alter table public.invitations enable row level security;
alter table public.rsvps enable row level security;

revoke all on table public.invitations from anon, authenticated;
revoke all on table public.rsvps from anon, authenticated;
grant select, insert, update, delete on table public.invitations to service_role;
grant select, insert, update, delete on table public.rsvps to service_role;

comment on table public.invitations is 'Invitaciones privadas gestionadas exclusivamente desde las funciones del servidor.';
comment on table public.rsvps is 'Confirmación vigente de cada invitación; una fila por invitación.';
