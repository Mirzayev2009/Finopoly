-- Run once in the Supabase SQL Editor for this project.
-- Reference copy of the schema documented inline in src/repo/*.js —
-- not applied automatically by anything in this repo.

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null,
  status text not null default 'lobby', -- 'lobby' | 'active' | 'finished'
  version integer not null default 1,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id),
  user_id uuid not null,
  name text not null,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id),
  seq integer not null,
  player_id uuid not null,
  action jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id),
  email text,
  display_name text
);

-- apps/server always writes with the service_role key, which bypasses RLS.
-- apps/web reads with the anon key (both direct selects and Realtime
-- subscriptions), so RLS must explicitly allow that.
alter table games enable row level security;
alter table game_players enable row level security;
alter table events enable row level security;
alter table profiles enable row level security;

create policy "authenticated can read games" on games
  for select to authenticated using (true);

create policy "authenticated can read game_players" on game_players
  for select to authenticated using (true);

create policy "users can read own profile" on profiles
  for select to authenticated using (id = auth.uid());

-- Realtime: apps/web subscribes to postgres_changes on these two tables.
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table game_players;
