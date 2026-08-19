-- Run in the Supabase SQL Editor for this project. Safe to re-run —
-- every statement is idempotent. Reference copy of the schema documented
-- inline in src/repo/*.js — not applied automatically by anything in this
-- repo.

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null,
  status text not null default 'lobby', -- 'lobby' | 'active' | 'finished'
  version integer not null default 1,
  state jsonb not null,
  created_at timestamptz not null default now()
);
-- Known drift on this project: the live table also has `current_round` and
-- `phase_deadline` columns not listed above. Nothing in the current app
-- reads or writes them (round/deadline live inside the `state` jsonb blob
-- instead, per packages/engine's state shape) — left alone here rather than
-- guessed at or dropped.

create table if not exists game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id),
  user_id uuid not null,
  name text not null,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (game_id, user_id)
);
-- Known drift: the live table also has `team_id`/`team_role` columns.
-- Unused by the current app (team/role assignment lives entirely inside
-- games.state.teams/.members, synthesized fresh by api/games/start.js) —
-- left alone rather than guessed at or dropped.

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

-- On this project, `profiles` already existed with a different column set
-- (username, avatar_url, games_played, games_won — from an earlier
-- iteration) before this schema.sql was written, so `create table if not
-- exists` above was a no-op and never added the columns the app actually
-- needs. These two ALTERs are non-destructive (existing columns/data are
-- left untouched) and fix the real bug: handle_new_user's INSERT below was
-- failing on every new signup because `email`/`display_name` didn't exist
-- yet, surfacing to users as "Database error creating new user".
alter table profiles add column if not exists email text;
alter table profiles add column if not exists display_name text;

-- apps/server always writes with the service_role key, which bypasses RLS.
-- apps/web reads with the anon key (both direct selects and Realtime
-- subscriptions), so RLS must explicitly allow that.
alter table games enable row level security;
alter table game_players enable row level security;
alter table events enable row level security;
alter table profiles enable row level security;

drop policy if exists "authenticated can read games" on games;
create policy "authenticated can read games" on games
  for select to authenticated using (true);

drop policy if exists "authenticated can read game_players" on game_players;
create policy "authenticated can read game_players" on game_players
  for select to authenticated using (true);

drop policy if exists "users can read own profile" on profiles;
create policy "users can read own profile" on profiles
  for select to authenticated using (id = auth.uid());

-- apps/server also updates profiles via the service_role key (bypasses this
-- policy); it exists for defense-in-depth / any future direct anon-key writes.
drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Populates profiles.display_name for both manual signup and OAuth sign-in:
-- manual signup passes `name` as user metadata (`full_name`) at signUp()
-- time; OAuth providers (Google, GitHub) populate raw_user_meta_data
-- automatically. Runs after every new auth.users row so it never needs to
-- special-case OAuth vs manual on the client.
--
-- Also sets `username`: discovered live (not in this file's original
-- design) to be NOT NULL with no default, so every insert was failing with
-- "null value in column username violates not-null constraint" once the
-- email/display_name columns existed. Suffixed with 8 chars of the user's
-- id to stay collision-safe in case anything downstream assumes uniqueness
-- (no unique constraint was confirmed, but this costs nothing and avoids
-- finding out the hard way).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, display_name, username)
  values (
    new.id,
    new.email,
    resolved_name,
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8)
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pre-existing auth.users rows created before this trigger existed will not
-- get a profiles row retroactively (no backfill). api/profiles/me.js already
-- falls back gracefully, and its PATCH handler upserts, so such a user's row
-- is created the first time they edit their name.

-- Realtime: apps/web subscribes to postgres_changes on these two tables.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'
  ) then
    alter publication supabase_realtime add table games;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_players'
  ) then
    alter publication supabase_realtime add table game_players;
  end if;
end $$;
