create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  slug text primary key,
  name text not null,
  player_count integer not null default 0 check (player_count >= 0 and player_count <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  tournament_slug text not null references public.tournaments(slug) on delete cascade,
  display_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.point_entries (
  id bigserial primary key,
  tournament_slug text not null references public.tournaments(slug) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  kicktipp_matchday integer not null check (kicktipp_matchday between 1 and 14),
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  unique (player_id, kicktipp_matchday)
);

alter table public.point_entries
drop constraint if exists point_entries_kicktipp_matchday_check;

alter table public.point_entries
add constraint point_entries_kicktipp_matchday_check check (kicktipp_matchday between 1 and 14);

comment on column public.point_entries.kicktipp_matchday is
'1-10 = Kicktipp-Gruppenphase, 11 = Achtelfinale, 12 = Viertelfinale, 13 = Halbfinale, 14 = Finale';

alter table public.tournaments enable row level security;
alter table public.players enable row level security;
alter table public.point_entries enable row level security;

drop policy if exists "Public can read tournaments" on public.tournaments;
create policy "Public can read tournaments"
on public.tournaments for select
using (true);

drop policy if exists "Public can read players" on public.players;
create policy "Public can read players"
on public.players for select
using (true);

drop policy if exists "Public can read point entries" on public.point_entries;
create policy "Public can read point entries"
on public.point_entries for select
using (true);

insert into public.tournaments (slug, name, player_count)
values ('wm-2026', 'WM 2026', 0)
on conflict (slug) do nothing;
