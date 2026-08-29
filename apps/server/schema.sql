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

-- ============================================================================
-- Market Masters / Finopoly rebuild — new schema below.
--
-- `games`, `game_players`, `events` above are the OLD game model (consumed by
-- packages/engine, a 4-round/sector portfolio game). They're left in place,
-- untouched: packages/engine is deleted as part of this rebuild and nothing
-- in the new app reads or writes those three tables, but dropping them would
-- be a destructive, irreversible move on tables that may hold real data from
-- prior test games, for zero benefit (no name collisions with anything
-- below). Drop them in a deliberate later pass once that's confirmed safe.
--
-- New model: syndicates move around a 40-space board (packages/content/
-- board.js) across historical eras (packages/content/eras.js, 10 eras x 72
-- investment cards each) in one of several classroom `rooms`, drawing news
-- cards (packages/content/news.js, 20 cards) on market-news spaces. All of
-- that content stays in JS as the single source of truth — nothing below
-- duplicates ERAS/NEWS_CARDS into SQL; the tables below only hold the
-- *mutable, per-room* game state (whose deck is in what order, whose turn it
-- is, who owns how much cash).
-- ============================================================================

-- profiles gets a role column driving action authorization (host/admin-only
-- actions are gated on this in apply_room_action() below). No self-serve UI
-- sets this — the first host/admin is hand-set via the Supabase SQL editor,
-- same as this file already hand-patches `profiles` elsewhere.
alter table profiles add column if not exists app_role text not null default 'player';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_app_role_check') then
    alter table profiles add constraint profiles_app_role_check
      check (app_role in ('player', 'host', 'admin'));
  end if;
end $$;

-- Global singleton: which era we're on, in what sequence, across every room.
create table if not exists game_state (
  id integer primary key default 1,
  status text not null default 'lobby', -- 'lobby' | 'active' | 'finished'
  era_sequence text[] not null default array[
    'tradewar', 'crypto', 'aiboom', 'ukraine', 'banks2023',
    'asia1997', 'covid', 'gfc2008', 'depression', 'postwar'
  ],
  current_era_index integer not null default 0,
  starting_cash integer not null default 2000,
  created_at timestamptz not null default now(),
  constraint game_state_singleton check (id = 1)
);
insert into game_state (id) values (1) on conflict (id) do nothing;

-- One row per classroom. Pre-provisioned (not created per-game like the old
-- `games` table) — REGISTER_SYNDICATE etc. all target an existing room by slug.
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  phase text not null default 'lobby', -- UI phase: lobby|briefing|playing|debrief (SET_PHASE)
  era_status text not null default 'active', -- 'active' | 'intermission'
  turn_index integer not null default 0,
  round_ending boolean not null default false,
  timer_deadline timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists syndicates (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  color text not null,
  join_code text unique not null,
  turn_order integer not null,
  position integer not null default 0,
  cash integer not null default 0,
  era_starting_cash integer not null default 0,
  lap_turns_taken integer not null default 0,
  next_multiplier integer not null default 1,
  hedge_fund boolean not null default false,
  insider_info boolean not null default false,
  blind_faith boolean not null default false,
  big_short boolean not null default false,
  monopoly_power boolean not null default false,
  sabotaged boolean not null default false,
  frozen boolean not null default false,
  immune boolean not null default false,
  notes text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint syndicates_cash_nonneg check (cash >= 0),
  unique (room_id, turn_order)
);
create index if not exists idx_syndicates_room on syndicates(room_id);
-- Max-8-per-room is a business rule (REGISTER_SYNDICATE's count check below),
-- not a structural constraint.

-- Which auth users belong to which syndicate, and who's the current "acting
-- device" (CLAIM_ACTOR) — exactly one is_actor=true per syndicate, enforced
-- in the RPC (unset the rest, set the new one in one statement) rather than
-- a partial unique index, since that swap has to be one transaction anyway.
create table if not exists syndicate_members (
  id uuid primary key default gen_random_uuid(),
  syndicate_id uuid not null references syndicates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  is_actor boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (syndicate_id, user_id)
);
create index if not exists idx_syndicate_members_syndicate on syndicate_members(syndicate_id);
create index if not exists idx_syndicate_members_user on syndicate_members(user_id);

-- One live shuffled deck per room, replaced whole on era advance (see
-- set_room_deck() below — populated from apps/server's Node layer, which
-- reads ERAS and shuffles; nothing here knows about era content itself).
create table if not exists room_decks (
  room_id uuid primary key references rooms(id) on delete cascade,
  era_id text not null,
  cards jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- The ONE open turn per room — its existence *is* the "a turn is in
-- progress" state. news_card starts null even on a 'news' stage row: the
-- news-card pool lives in packages/content/news.js, not SQL, so ROLL() below
-- only marks the space landed on; apps/server's Node layer picks the actual
-- card and writes it in with set_pending_news_card() as an immediate
-- follow-up call, still entirely server-side and still atomic per-call.
create table if not exists pending_turns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references rooms(id) on delete cascade,
  syndicate_id uuid not null references syndicates(id) on delete cascade,
  stage text not null, -- 'awaiting_pick' | 'news' | 'corner'
  dice_1 integer,
  dice_2 integer,
  from_position integer not null,
  to_position integer not null,
  wrapped boolean not null default false,
  drawn_cards jsonb,
  news_card jsonb,
  corner_event text, -- ANGEL_INVESTMENT | CORPORATE_BUYOUT | WHITE_COLLAR_PRISON
  decision_deadline timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  syndicate_id uuid references syndicates(id) on delete set null,
  action_type text not null,
  amount integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_transactions_room_created on transactions(room_id, created_at desc);

alter table game_state enable row level security;
alter table rooms enable row level security;
alter table syndicates enable row level security;
alter table syndicate_members enable row level security;
alter table room_decks enable row level security;
alter table pending_turns enable row level security;
alter table transactions enable row level security;
-- Deliberately no SELECT/INSERT/UPDATE policies for anon/authenticated on any
-- table above: every read in the new app is either a service_role-backed
-- server endpoint or a Realtime broadcast (never postgres_changes on these
-- tables — see the broadcast policies further down), so leaving RLS enabled
-- with zero policies means a stray direct client query returns nothing, by
-- construction, rather than depending on getting granular policies exactly
-- right to avoid a hidden-percentage leak.

-- ----------------------------------------------------------------------
-- Helper functions used by apply_room_action() below.
-- ----------------------------------------------------------------------

-- First index (0-based) in a jsonb array of cards whose ->>'type' matches,
-- or -1 if none. Used by the 3-card balancer / insider-info / sabotage bias.
create or replace function find_card_index(p_cards jsonb, p_type text)
returns int language sql immutable as $$
  select coalesce(
    (select min(ord) - 1
     from jsonb_array_elements(p_cards) with ordinality as t(elem, ord)
     where elem ->> 'type' = p_type),
    -1
  );
$$;

-- Deals p_count cards off the front of a room's live deck, applying the
-- reference server's exact balancer: insider_info always biases toward
-- Good (falling back to Bad if none left); sabotaged always biases toward
-- Bad (falling back to Good); otherwise, once 2 cards are already drawn, a
-- 2-Good draw forces the next pick Bad and vice versa, so a team is never
-- shown three obvious winners or losers. Returns
-- {"dealt": [...], "remaining": [...]}.
create or replace function deal_cards(p_deck jsonb, p_count int, p_insider boolean, p_sabotaged boolean)
returns jsonb language plpgsql as $$
declare
  v_remaining jsonb := coalesce(p_deck, '[]'::jsonb);
  v_dealt jsonb := '[]'::jsonb;
  v_good_count int := 0;
  v_bad_count int := 0;
  v_idx int;
  v_card jsonb;
  i int;
begin
  for i in 1..p_count loop
    exit when jsonb_array_length(v_remaining) = 0; -- deck exhausted (defensive; decks hold 72)

    v_idx := 0;
    if p_insider then
      v_idx := find_card_index(v_remaining, 'Good');
      if v_idx = -1 then v_idx := find_card_index(v_remaining, 'Bad'); end if;
    elsif p_sabotaged then
      v_idx := find_card_index(v_remaining, 'Bad');
      if v_idx = -1 then v_idx := find_card_index(v_remaining, 'Good'); end if;
    elsif jsonb_array_length(v_dealt) >= 2 then
      if v_good_count >= 2 then
        v_idx := find_card_index(v_remaining, 'Bad');
      elsif v_bad_count >= 2 then
        v_idx := find_card_index(v_remaining, 'Good');
      end if;
    end if;
    if v_idx = -1 or v_idx is null then v_idx := 0; end if;

    v_card := v_remaining -> v_idx;
    v_dealt := v_dealt || jsonb_build_array(v_card);
    select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb) into v_remaining
      from jsonb_array_elements(v_remaining) with ordinality as t(elem, ord)
      where ord - 1 <> v_idx;

    if v_card ->> 'type' = 'Good' then
      v_good_count := v_good_count + 1;
    else
      v_bad_count := v_bad_count + 1;
    end if;
  end loop;

  return jsonb_build_object('dealt', v_dealt, 'remaining', v_remaining);
end;
$$;

-- Shared by every turn-ending action (SUBMIT_INVESTMENT, FORCE_SUBMIT,
-- RESOLVE_NEWS, RESOLVE_CORNER, SKIP_TURN, the automatic frozen-skip inside
-- ROLL) so "did the room just complete a lap" can't be skipped on any one
-- path. The reference server never advances turnIndex after news/corner at
-- all; every path here does, or the game would stall.
create or replace function advance_room_turn(p_room_id uuid)
returns void language plpgsql as $$
declare
  v_count int;
  v_room rooms%rowtype;
  v_new_index int;
begin
  delete from pending_turns where room_id = p_room_id;
  select count(*) into v_count from syndicates where room_id = p_room_id;
  select * into v_room from rooms where id = p_room_id;
  v_new_index := case when v_count = 0 then 0 else (v_room.turn_index + 1) % v_count end;

  update rooms set
    turn_index = v_new_index,
    era_status = case when round_ending and v_new_index = 0 then 'intermission' else era_status end,
    round_ending = case when round_ending and v_new_index = 0 then false else round_ending end
  where id = p_room_id;
end;
$$;

-- Shared by SUBMIT_INVESTMENT and FORCE_SUBMIT: the reference server's exact
-- profit/loss formula (big_short flips sign, blind_faith doubles a positive
-- result, next_multiplier applies after, hedge_fund zeroes a loss), cash
-- floored at 0, unselected cards returned to the deck and reshuffled, every
-- modifier flag cleared, one turn advanced.
create or replace function resolve_investment_core(
  p_room_id uuid, p_syndicate_id uuid, p_drawn_cards jsonb,
  p_card_id text, p_bet_amount int, p_note_prefix text
) returns void language plpgsql as $$
declare
  v_syn syndicates%rowtype;
  v_chosen jsonb;
  v_unselected jsonb;
  v_pct numeric;
  v_profit_loss int;
  v_deck jsonb;
begin
  select * into v_syn from syndicates where id = p_syndicate_id for update;

  select elem into v_chosen from jsonb_array_elements(p_drawn_cards) elem
    where elem ->> 'id' = p_card_id limit 1;
  if v_chosen is null then
    raise exception 'INVALID_CARD';
  end if;
  if p_bet_amount < 0 or p_bet_amount > v_syn.cash then
    raise exception 'INVALID_BET';
  end if;

  select coalesce(jsonb_agg(elem), '[]'::jsonb) into v_unselected
    from jsonb_array_elements(p_drawn_cards) elem
    where elem ->> 'id' <> p_card_id;

  v_pct := (v_chosen ->> 'percentage')::numeric;
  if v_syn.big_short then v_pct := -v_pct; end if;
  if v_syn.blind_faith and v_pct > 0 then v_pct := v_pct * 2; end if;

  v_profit_loss := floor(p_bet_amount * v_pct / 100.0)::int * v_syn.next_multiplier;
  if v_syn.hedge_fund and v_profit_loss < 0 then v_profit_loss := 0; end if;

  update syndicates set
    cash = greatest(0, cash + v_profit_loss),
    lap_turns_taken = lap_turns_taken + 1,
    next_multiplier = 1,
    hedge_fund = false, insider_info = false, blind_faith = false, big_short = false,
    monopoly_power = false, sabotaged = false, frozen = false, immune = false
  where id = p_syndicate_id;

  select cards into v_deck from room_decks where room_id = p_room_id for update;
  update room_decks set
    cards = (
      select coalesce(jsonb_agg(elem order by random()), '[]'::jsonb)
      from jsonb_array_elements(coalesce(v_deck, '[]'::jsonb) || v_unselected) elem
    ),
    version = version + 1
  where room_id = p_room_id;

  insert into transactions (room_id, syndicate_id, action_type, amount, note)
  values (
    p_room_id, p_syndicate_id, 'INVESTMENT', v_profit_loss,
    p_note_prefix || format(
      'Bet $%s on %s at %s%s%%',
      p_bet_amount, v_chosen ->> 'name',
      case when v_pct >= 0 then '+' else '' end, v_pct
    )
  );

  perform advance_room_turn(p_room_id);
end;
$$;

-- Fills in the news card for a pending 'news' turn. Called immediately after
-- ROLL() lands on a market-news space, by apps/server's Node layer (which
-- picks the random card from packages/content/news.js) -- this is the one
-- deliberate two-call sequence in the whole design, so game content never
-- has to be duplicated into SQL. Still fully server-side and version-guarded.
create or replace function set_pending_news_card(p_room_id uuid, p_expected_version int, p_news_card jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype;
  v_updated int;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'VERSION_CONFLICT';
  end if;

  update pending_turns set news_card = p_news_card where room_id = p_room_id and stage = 'news';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'NO_PENDING_NEWS_SLOT'; end if;

  update rooms set version = version + 1 where id = p_room_id;
  return jsonb_build_object('room_id', p_room_id);
end;
$$;

-- (Re)populates a room's live deck. Called only from apps/server's
-- advance-era orchestration, immediately after advance_era() below succeeds
-- -- not a user-facing action, so it isn't version-guarded against `rooms`;
-- the brief window where a room's era_status is already 'active' but its
-- deck isn't populated yet is an accepted tradeoff of the same shape as the
-- broadcast-after-commit one documented in the implementation plan.
create or replace function set_room_deck(p_room_id uuid, p_era_id text, p_cards jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into room_decks (room_id, era_id, cards)
  values (p_room_id, p_era_id, p_cards)
  on conflict (room_id) do update set
    era_id = excluded.era_id,
    cards = excluded.cards,
    version = room_decks.version + 1,
    updated_at = now();
end;
$$;

-- ----------------------------------------------------------------------
-- apply_room_action() -- the one dispatcher for every room-scoped action.
-- One function (not 16) because they all share identical concurrency/
-- authorization/logging shape and only the mutation body differs, mirroring
-- docs/index.js's own single big switch. Locks the `rooms` row first and
-- checks p_expected_version before anything else, so two concurrent calls
-- against the same room always serialize on that lock rather than racing;
-- every branch below runs inside that same already-locked transaction.
-- ----------------------------------------------------------------------
create or replace function apply_room_action(
  p_room_id uuid, p_actor_id uuid, p_expected_version int,
  p_action_type text, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype;
  v_actor_role text;
  v_now timestamptz := now();
  v_syndicate_count int;
  v_current_syndicate syndicates%rowtype;
begin
  select app_role into v_actor_role from profiles where id = p_actor_id;
  if v_actor_role is null then
    raise exception 'ACTOR_NOT_FOUND';
  end if;

  select * into v_room from rooms where id = p_room_id for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if v_room.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'VERSION_CONFLICT';
  end if;

  if p_action_type in (
    'REGISTER_SYNDICATE', 'REMOVE_SYNDICATE', 'ROLL', 'FORCE_SUBMIT', 'RESOLVE_NEWS',
    'RESOLVE_CORNER', 'SKIP_TURN', 'ADJUST', 'START_TIMER', 'ADJUST_TIMER', 'CLEAR_TIMER',
    'SET_PHASE'
  ) and v_actor_role not in ('host', 'admin') then
    raise exception 'FORBIDDEN';
  end if;

  case p_action_type

  when 'REGISTER_SYNDICATE' then
    declare
      v_new_id uuid;
      v_colors text[] := array['#E8B44A','#34D399','#60A5FA','#F472B6','#F59E0B','#A78BFA','#F43F5E','#22D3EE'];
      v_starting_cash int := (select starting_cash from game_state where id = 1);
    begin
      select count(*) into v_syndicate_count from syndicates where room_id = p_room_id;
      if v_syndicate_count >= 8 then
        raise exception 'ROOM_FULL';
      end if;
      insert into syndicates (room_id, name, color, join_code, turn_order, cash, era_starting_cash)
      values (
        p_room_id,
        p_payload ->> 'name',
        v_colors[(v_syndicate_count % 8) + 1],
        upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
        v_syndicate_count,
        v_starting_cash,
        v_starting_cash
      )
      returning id into v_new_id;
      insert into transactions (room_id, syndicate_id, action_type, amount, note)
      values (p_room_id, v_new_id, 'REGISTER', v_starting_cash, 'Syndicate registered');
    end;

  when 'REMOVE_SYNDICATE' then
    declare
      v_target uuid := (p_payload ->> 'id')::uuid;
      v_removed_order int;
    begin
      select turn_order into v_removed_order from syndicates where id = v_target and room_id = p_room_id;
      delete from syndicates where id = v_target and room_id = p_room_id;
      with ranked as (
        select id, row_number() over (order by turn_order) - 1 as new_order
        from syndicates where room_id = p_room_id
      )
      update syndicates s set turn_order = r.new_order from ranked r where s.id = r.id;

      select count(*) into v_syndicate_count from syndicates where room_id = p_room_id;
      if v_syndicate_count = 0 then
        update rooms set turn_index = 0 where id = p_room_id;
      elsif v_removed_order is not null and v_removed_order < v_room.turn_index then
        -- Removing a syndicate ahead of the current turn-holder in order
        -- shifts everyone after it down by one on renumbering; without this,
        -- turn_index would keep pointing at the same numeric slot but a
        -- different syndicate now sits there, silently reassigning the turn.
        update rooms set turn_index = v_room.turn_index - 1 where id = p_room_id;
      elsif v_room.turn_index >= v_syndicate_count then
        update rooms set turn_index = 0 where id = p_room_id;
      end if;
    end;

  when 'ROLL' then
    if exists (select 1 from pending_turns where room_id = p_room_id) then
      raise exception 'TURN_ALREADY_PENDING';
    end if;
    select count(*) into v_syndicate_count from syndicates where room_id = p_room_id;
    if v_syndicate_count = 0 then
      raise exception 'NO_SYNDICATES';
    end if;
    select * into v_current_syndicate from syndicates
      where room_id = p_room_id order by turn_order limit 1 offset v_room.turn_index
      for update;

    if v_current_syndicate.frozen then
      update syndicates set frozen = false where id = v_current_syndicate.id;
      insert into transactions (room_id, syndicate_id, action_type, amount, note)
        values (p_room_id, v_current_syndicate.id, 'SKIPPED', 0, 'Turn skipped (frozen)');
      perform advance_room_turn(p_room_id);
    else
      declare
        v_d1 int := 1 + floor(random() * 6)::int;
        v_d2 int := 1 + floor(random() * 6)::int;
        v_sum int := 0;
        v_from int := v_current_syndicate.position;
        v_raw int := 0;
        v_to int := 0;
        v_wrapped boolean := false;
        v_corner_type text;
        v_deal jsonb;
      begin
        v_sum := v_d1 + v_d2;
        v_raw := v_from + v_sum;
        v_to := v_raw % 40;
        v_wrapped := v_raw >= 40;

        update syndicates set position = v_to where id = v_current_syndicate.id;

        if v_wrapped then
          update syndicates set cash = greatest(0, cash + 200) where id = v_current_syndicate.id;
          update rooms set round_ending = true where id = p_room_id;
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_current_syndicate.id, 'START_BONUS', 200, 'Passed START');
        end if;

        if v_to in (10, 20, 30) then
          v_corner_type := case v_to
            when 10 then 'ANGEL_INVESTMENT'
            when 20 then 'WHITE_COLLAR_PRISON'
            when 30 then 'CORPORATE_BUYOUT'
          end;
          if v_corner_type = 'WHITE_COLLAR_PRISON' then
            -- No host resolution needed -- applies immediately, turn ends now.
            update syndicates set frozen = true, immune = true where id = v_current_syndicate.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_current_syndicate.id, 'JAIL', 0, 'Sent to White Collar Prison');
            perform advance_room_turn(p_room_id);
          else
            insert into pending_turns (
              room_id, syndicate_id, stage, dice_1, dice_2, from_position, to_position, wrapped,
              corner_event, decision_deadline
            ) values (
              p_room_id, v_current_syndicate.id, 'corner', v_d1, v_d2, v_from, v_to, v_wrapped,
              v_corner_type, v_now + interval '60 seconds'
            );
          end if;
        elsif v_to in (2, 7, 17, 22, 33, 36) then
          insert into pending_turns (
            room_id, syndicate_id, stage, dice_1, dice_2, from_position, to_position, wrapped,
            decision_deadline
          ) values (
            p_room_id, v_current_syndicate.id, 'news', v_d1, v_d2, v_from, v_to, v_wrapped,
            v_now + interval '60 seconds'
          );
        else
          if not exists (select 1 from room_decks where room_id = p_room_id) then
            raise exception 'NO_ACTIVE_DECK';
          end if;
          v_deal := deal_cards(
            (select cards from room_decks where room_id = p_room_id for update),
            case when v_current_syndicate.monopoly_power then 5 else 3 end,
            v_current_syndicate.insider_info,
            v_current_syndicate.sabotaged
          );
          update room_decks set cards = v_deal -> 'remaining', version = version + 1
            where room_id = p_room_id;
          insert into pending_turns (
            room_id, syndicate_id, stage, dice_1, dice_2, from_position, to_position, wrapped,
            drawn_cards, decision_deadline
          ) values (
            p_room_id, v_current_syndicate.id, 'awaiting_pick', v_d1, v_d2, v_from, v_to, v_wrapped,
            v_deal -> 'dealt', v_now + interval '90 seconds'
          );
        end if;
      end;
    end if;

  when 'SUBMIT_INVESTMENT' then
    declare
      v_pending pending_turns%rowtype;
      v_turn_syn syndicates%rowtype;
    begin
      select * into v_pending from pending_turns where room_id = p_room_id for update;
      if not found or v_pending.stage <> 'awaiting_pick' then
        raise exception 'NO_PENDING_PICK';
      end if;
      select * into v_turn_syn from syndicates where id = v_pending.syndicate_id;
      if not exists (
        select 1 from syndicate_members
        where syndicate_id = v_turn_syn.id and user_id = p_actor_id and is_actor = true
      ) then
        raise exception 'NOT_ACTING_DEVICE';
      end if;
      perform resolve_investment_core(
        p_room_id, v_turn_syn.id, v_pending.drawn_cards,
        p_payload ->> 'cardId', (p_payload ->> 'betAmount')::int, ''
      );
    end;

  when 'CLAIM_ACTOR' then
    declare
      v_syn_id uuid;
    begin
      select s.id into v_syn_id from syndicate_members sm
        join syndicates s on s.id = sm.syndicate_id
        where sm.user_id = p_actor_id and s.room_id = p_room_id limit 1;
      if v_syn_id is null then raise exception 'NOT_A_MEMBER'; end if;
      update syndicate_members set is_actor = false where syndicate_id = v_syn_id;
      update syndicate_members set is_actor = true
        where syndicate_id = v_syn_id and user_id = p_actor_id;
    end;

  when 'FORCE_SUBMIT' then
    declare
      v_pending pending_turns%rowtype;
    begin
      select * into v_pending from pending_turns where room_id = p_room_id for update;
      if not found or v_pending.stage <> 'awaiting_pick' then
        raise exception 'NO_PENDING_PICK';
      end if;
      if v_pending.decision_deadline is not null and v_now < v_pending.decision_deadline then
        raise exception 'DEADLINE_NOT_PASSED';
      end if;
      perform resolve_investment_core(
        p_room_id, v_pending.syndicate_id, v_pending.drawn_cards,
        p_payload ->> 'cardId', (p_payload ->> 'betAmount')::int, '(host force-submitted) '
      );
    end;

  when 'RESOLVE_NEWS' then
    declare
      v_pending pending_turns%rowtype;
      v_syn syndicates%rowtype;
      v_first syndicates%rowtype;
      v_last syndicates%rowtype;
      v_target syndicates%rowtype;
      v_effect text;
      v_target_id uuid := nullif(p_payload ->> 'targetId', '')::uuid;
      v_amount int;
      v_heads boolean;
      v_other_count int;
      v_share int;
      v_remainder int;
      v_remainder_recipient uuid;
      v_row syndicates%rowtype;
    begin
      select * into v_pending from pending_turns where room_id = p_room_id for update;
      if not found or v_pending.stage <> 'news' or v_pending.news_card is null then
        raise exception 'NO_PENDING_NEWS';
      end if;
      select * into v_syn from syndicates where id = v_pending.syndicate_id for update;
      v_effect := v_pending.news_card ->> 'effect';

      select * into v_first from syndicates where room_id = p_room_id order by cash desc, turn_order limit 1;
      select * into v_last from syndicates where room_id = p_room_id order by cash asc, turn_order desc limit 1;

      case v_effect
        when 'MULTIPLIER' then
          update syndicates set next_multiplier = (v_pending.news_card ->> 'value')::int where id = v_syn.id;
        when 'HEDGE_FUND' then
          update syndicates set hedge_fund = true where id = v_syn.id;
        when 'INSIDER_INFO' then
          update syndicates set insider_info = true where id = v_syn.id;
        when 'BLIND_FAITH' then
          update syndicates set blind_faith = true where id = v_syn.id;
        when 'BIG_SHORT' then
          update syndicates set big_short = true where id = v_syn.id;
        when 'MONOPOLY_POWER' then
          update syndicates set monopoly_power = true where id = v_syn.id;

        when 'FREEZE' then
          if v_target_id is null then raise exception 'TARGET_REQUIRED'; end if;
          update syndicates set frozen = true where id = v_target_id and room_id = p_room_id;

        when 'SABOTAGE' then
          if v_target_id is null then raise exception 'TARGET_REQUIRED'; end if;
          update syndicates set sabotaged = true where id = v_target_id and room_id = p_room_id;

        when 'WEALTH_TAX' then
          if not v_first.immune then
            v_amount := floor(v_first.cash * 0.20)::int;
            update syndicates set cash = greatest(0, cash - v_amount) where id = v_first.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_first.id, 'WEALTH_TAX', -v_amount, 'Wealth Tax');
          end if;

        when 'STIMULUS' then
          -- Fix C: a real transfer (leader pays, others split it), not money
          -- minted from nothing like the reference server does.
          v_amount := floor(v_first.cash * 0.20)::int;
          select count(*) into v_other_count from syndicates where room_id = p_room_id and id <> v_first.id;
          if v_other_count > 0 then
            v_share := v_amount / v_other_count;
            v_remainder := v_amount - (v_share * v_other_count);
            update syndicates set cash = greatest(0, cash - v_amount) where id = v_first.id;
            update syndicates set cash = cash + v_share where room_id = p_room_id and id <> v_first.id;
            -- Leftover cents from the integer-division split must always go
            -- somewhere (money conservation) — prefer the acting syndicate,
            -- but fall back to any non-leader syndicate when the leader
            -- itself is the one who landed on this card, so the remainder
            -- is never simply deducted from the leader and credited to no one.
            v_remainder_recipient := coalesce(
              nullif(v_syn.id, v_first.id),
              (select id from syndicates where room_id = p_room_id and id <> v_first.id order by turn_order limit 1)
            );
            update syndicates set cash = cash + v_remainder where id = v_remainder_recipient;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_first.id, 'STIMULUS', -v_amount, 'Funded stimulus checks');
          end if;

        when 'EMBEZZLE' then
          if not v_first.immune then
            v_amount := floor(v_first.cash * 0.20)::int;
            update syndicates set cash = greatest(0, cash - v_amount) where id = v_first.id;
            update syndicates set cash = cash + v_amount where id = v_syn.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'EMBEZZLE', v_amount, 'Embezzlement');
          end if;

        when 'PHILANTHROPY' then
          if v_syn.id <> v_last.id then
            v_amount := floor(v_syn.cash * 0.25)::int;
            update syndicates set cash = greatest(0, cash - v_amount) where id = v_syn.id;
            update syndicates set cash = cash + v_amount where id = v_last.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'PHILANTHROPY', -v_amount, 'Donated to last place');
          else
            v_amount := 0;
            for v_row in select * from syndicates where room_id = p_room_id and id <> v_syn.id loop
              if not v_row.immune then
                declare
                  v_bit int := floor(v_row.cash * 0.067)::int;
                begin
                  update syndicates set cash = greatest(0, cash - v_bit) where id = v_row.id;
                  v_amount := v_amount + v_bit;
                end;
              end if;
            end loop;
            update syndicates set cash = cash + v_amount where id = v_syn.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'PHILANTHROPY_BAILOUT', v_amount, 'Received bailout from all teams');
          end if;

        when 'AUDIT' then
          v_heads := random() < 0.5;
          v_amount := floor(v_syn.cash * 0.30)::int;
          if v_heads then
            update syndicates set cash = cash + v_amount where id = v_syn.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'AUDIT_WIN', v_amount, 'Passed audit');
          else
            update syndicates set cash = greatest(0, cash - v_amount) where id = v_syn.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'AUDIT_LOSS', -v_amount, 'Failed audit');
          end if;

        when 'BAILOUT' then
          declare
            v_floor int := (select starting_cash from game_state where id = 1);
          begin
            if v_syn.cash < v_floor then
              v_amount := v_floor - v_syn.cash;
              update syndicates set cash = v_floor where id = v_syn.id;
              insert into transactions (room_id, syndicate_id, action_type, amount, note)
                values (p_room_id, v_syn.id, 'BAILOUT', v_amount, 'Bailout to starting cash');
            end if;
          end;

        when 'HOSTILE_BID' then
          if v_target_id is null then raise exception 'TARGET_REQUIRED'; end if;
          select * into v_target from syndicates where id = v_target_id and room_id = p_room_id for update;
          if not found then raise exception 'TARGET_NOT_FOUND'; end if;
          v_heads := random() < 0.5;
          if v_heads then
            v_amount := floor(v_target.cash * 0.20)::int;
            update syndicates set cash = greatest(0, cash - v_amount) where id = v_target.id;
            update syndicates set cash = cash + v_amount where id = v_syn.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'HOSTILE_BID_WIN', v_amount, 'Won hostile bid');
          else
            v_amount := floor(v_syn.cash * 0.20)::int;
            update syndicates set cash = greatest(0, cash - v_amount) where id = v_syn.id;
            update syndicates set cash = cash + v_amount where id = v_target.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'HOSTILE_BID_LOSS', -v_amount, 'Lost hostile bid');
          end if;

        when 'BOOM' then
          update syndicates set cash = cash + floor(cash * 0.20)::int where room_id = p_room_id;
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_syn.id, 'BOOM', 0, 'Economic boom');

        when 'ROBIN_HOOD' then
          if not v_first.immune then
            v_amount := floor(v_first.cash * 0.30)::int;
            select count(*) into v_other_count from syndicates where room_id = p_room_id and id <> v_first.id;
            if v_other_count > 0 then
              v_share := v_amount / v_other_count;
              update syndicates set cash = greatest(0, cash - v_amount) where id = v_first.id;
              update syndicates set cash = cash + v_share where room_id = p_room_id and id <> v_first.id;
            end if;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'ROBIN_HOOD', 0, 'The Robin Hood');
          end if;

        when 'BLACK_SWAN' then
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_syn.id, 'BLACK_SWAN', 0, 'Black Swan event announced');

        when 'ANGEL_INVESTOR' then
          update syndicates set cash = cash + 1000, blind_faith = true where id = v_syn.id;
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_syn.id, 'ANGEL_INVESTOR', 1000, 'Angel Investor');

        when 'HIGH_STAKES_COIN' then
          v_heads := random() < 0.5;
          if v_heads then
            v_amount := floor(v_syn.cash * 0.33)::int;
            update syndicates set cash = cash + v_amount where id = v_syn.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'COIN_WIN', v_amount, 'High Stakes win');
          else
            update syndicates set cash = cash + 1000 where room_id = p_room_id and id <> v_syn.id;
            insert into transactions (room_id, syndicate_id, action_type, amount, note)
              values (p_room_id, v_syn.id, 'COIN_LOSS', 0, 'High Stakes loss (room splits $1000)');
          end if;

        else
          raise exception 'UNKNOWN_NEWS_EFFECT';
      end case;

      perform advance_room_turn(p_room_id);
    end;

  when 'RESOLVE_CORNER' then
    declare
      v_pending pending_turns%rowtype;
      v_syn syndicates%rowtype;
      v_target syndicates%rowtype;
      v_stake int;
      v_heads boolean;
      v_target_id uuid := nullif(p_payload ->> 'targetId', '')::uuid;
    begin
      select * into v_pending from pending_turns where room_id = p_room_id for update;
      if not found or v_pending.stage <> 'corner' then raise exception 'NO_PENDING_CORNER'; end if;
      select * into v_syn from syndicates where id = v_pending.syndicate_id for update;

      if v_pending.corner_event = 'ANGEL_INVESTMENT' then
        v_stake := floor(v_syn.cash / 2.0)::int;
        v_heads := random() < 0.5;
        if v_heads then
          update syndicates set cash = greatest(0, cash + v_stake) where id = v_syn.id;
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_syn.id, 'ANGEL_WIN', v_stake, 'Angel Investment win');
        else
          update syndicates set cash = greatest(0, cash - v_stake) where id = v_syn.id;
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_syn.id, 'ANGEL_LOSS', -v_stake, 'Angel Investment loss');
        end if;
      elsif v_pending.corner_event = 'CORPORATE_BUYOUT' then
        if v_target_id is null then raise exception 'TARGET_REQUIRED'; end if;
        select * into v_target from syndicates where id = v_target_id and room_id = p_room_id for update;
        if not found then raise exception 'TARGET_NOT_FOUND'; end if;
        v_heads := random() < 0.5;
        if v_heads then
          update syndicates set cash = greatest(0, cash - 1000) where id = v_target.id;
          update syndicates set cash = greatest(0, cash + 1000) where id = v_syn.id;
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_syn.id, 'BUYOUT_WIN', 1000, 'Won corporate buyout');
        else
          update syndicates set cash = greatest(0, cash - 1000) where id = v_syn.id;
          update syndicates set cash = greatest(0, cash + 1000) where id = v_target.id;
          insert into transactions (room_id, syndicate_id, action_type, amount, note)
            values (p_room_id, v_syn.id, 'BUYOUT_LOSS', -1000, 'Lost corporate buyout');
        end if;
      end if;

      perform advance_room_turn(p_room_id);
    end;

  when 'SKIP_TURN' then
    declare
      v_turn_syn syndicates%rowtype;
    begin
      select * into v_turn_syn from syndicates
        where room_id = p_room_id order by turn_order limit 1 offset v_room.turn_index;
      if found then
        insert into transactions (room_id, syndicate_id, action_type, amount, note)
          values (p_room_id, v_turn_syn.id, 'SKIPPED', 0, 'Turn skipped by host');
      end if;
      perform advance_room_turn(p_room_id);
    end;

  when 'ADJUST' then
    declare
      v_target uuid := (p_payload ->> 'syndicateId')::uuid;
      v_amount int := (p_payload ->> 'amount')::int;
      v_updated int;
    begin
      update syndicates set cash = greatest(0, cash + v_amount)
        where id = v_target and room_id = p_room_id;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then raise exception 'SYNDICATE_NOT_FOUND'; end if;
      insert into transactions (room_id, syndicate_id, action_type, amount, note)
        values (p_room_id, v_target, 'ADJUST', v_amount, coalesce(p_payload ->> 'note', ''));
    end;

  when 'JOIN_SYNDICATE' then
    declare
      v_syn_id uuid;
    begin
      if exists (
        select 1 from syndicate_members sm join syndicates s on s.id = sm.syndicate_id
        where sm.user_id = p_actor_id and s.room_id = p_room_id
      ) then
        raise exception 'ALREADY_BOUND';
      end if;
      select id into v_syn_id from syndicates
        where room_id = p_room_id and join_code = upper(p_payload ->> 'joinCode');
      if v_syn_id is null then raise exception 'INVALID_JOIN_CODE'; end if;
      insert into syndicate_members (syndicate_id, user_id, is_actor)
      values (
        v_syn_id, p_actor_id,
        not exists (select 1 from syndicate_members where syndicate_id = v_syn_id)
      );
    end;

  when 'UPDATE_NOTES' then
    declare
      v_syn_id uuid;
    begin
      select s.id into v_syn_id from syndicate_members sm
        join syndicates s on s.id = sm.syndicate_id
        where sm.user_id = p_actor_id and s.room_id = p_room_id limit 1;
      if v_syn_id is null then raise exception 'NOT_A_MEMBER'; end if;
      update syndicates set notes = left(coalesce(p_payload ->> 'text', ''), 2000) where id = v_syn_id;
    end;

  when 'START_TIMER' then
    update rooms set timer_deadline = v_now + make_interval(secs => (p_payload ->> 'seconds')::int)
      where id = p_room_id;

  when 'ADJUST_TIMER' then
    update rooms set timer_deadline = coalesce(timer_deadline, v_now)
      + make_interval(secs => (p_payload ->> 'deltaSeconds')::int)
      where id = p_room_id;

  when 'CLEAR_TIMER' then
    update rooms set timer_deadline = null where id = p_room_id;

  when 'SET_PHASE' then
    update rooms set phase = p_payload ->> 'phase' where id = p_room_id;

  else
    raise exception 'UNKNOWN_ACTION_TYPE';
  end case;

  update rooms set version = version + 1 where id = p_room_id;
  return jsonb_build_object('room_id', p_room_id);
end;
$$;

-- ----------------------------------------------------------------------
-- Global/admin actions -- not scoped to one room's version, so kept
-- separate from apply_room_action() rather than forcing a fake room id and
-- a second authorization shape onto that function's signature.
-- ----------------------------------------------------------------------

-- Fix F: hard end. Advances past the end of era_sequence sets status to
-- 'finished' and touches nothing else -- no wraparound back to era 0 like
-- the reference server. The first call (status still 'lobby') deals
-- era_sequence[0] rather than skipping past it, since there's no separate
-- "start game" action in the spec.
create or replace function advance_era(p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_state game_state%rowtype;
  v_next_index int;
  v_era_id text;
begin
  select app_role into v_role from profiles where id = p_actor_id;
  if v_role is null or v_role not in ('host', 'admin') then raise exception 'FORBIDDEN'; end if;

  select * into v_state from game_state where id = 1 for update;
  v_next_index := case when v_state.status = 'lobby' then 0 else v_state.current_era_index + 1 end;

  if v_next_index > array_length(v_state.era_sequence, 1) - 1 then
    update game_state set status = 'finished' where id = 1;
    return jsonb_build_object('status', 'finished');
  end if;

  v_era_id := v_state.era_sequence[v_next_index + 1]; -- pg arrays are 1-indexed

  update game_state set status = 'active', current_era_index = v_next_index where id = 1;
  -- `where true`: this project has Postgres's unqualified-update/delete
  -- protection enabled, which rejects any UPDATE/DELETE with no WHERE
  -- clause at all -- these three are intentionally unscoped (every room,
  -- every syndicate, every pending turn), so `where true` satisfies the
  -- guard without changing what rows are affected.
  update rooms set era_status = 'active', version = version + 1 where true;
  update syndicates set era_starting_cash = cash where true;
  delete from pending_turns where true; -- abandon any open turn across every room on era change

  return jsonb_build_object('status', 'active', 'era_id', v_era_id);
end;
$$;

create or replace function set_era_sequence(p_actor_id uuid, p_era_ids text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_status text;
begin
  select app_role into v_role from profiles where id = p_actor_id;
  if v_role is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
  select status into v_status from game_state where id = 1;
  if v_status <> 'lobby' then raise exception 'GAME_ALREADY_STARTED'; end if;
  update game_state set era_sequence = p_era_ids where id = 1;
  return jsonb_build_object('era_sequence', to_jsonb(p_era_ids));
end;
$$;

create or replace function set_starting_cash(p_actor_id uuid, p_amount int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_status text;
begin
  select app_role into v_role from profiles where id = p_actor_id;
  if v_role is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;
  select status into v_status from game_state where id = 1;
  if v_status <> 'lobby' then raise exception 'GAME_ALREADY_STARTED'; end if;
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  update game_state set starting_cash = p_amount where id = 1;
  return jsonb_build_object('starting_cash', p_amount);
end;
$$;

create or replace function reset_game(p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role text;
begin
  select app_role into v_role from profiles where id = p_actor_id;
  if v_role is distinct from 'admin' then raise exception 'FORBIDDEN'; end if;

  delete from transactions where true;
  delete from pending_turns where true;
  delete from syndicates where true; -- cascades to syndicate_members
  delete from room_decks where true;
  update rooms set
    phase = 'lobby', era_status = 'active', turn_index = 0,
    round_ending = false, timer_deadline = null, version = version + 1
  where true;
  update game_state set status = 'lobby', current_era_index = 0 where id = 1;

  return jsonb_build_object('status', 'reset');
end;
$$;

-- ----------------------------------------------------------------------
-- Realtime Authorization: gates which topics an authenticated client may
-- subscribe to (never postgres_changes on the tables above -- pending_turns.
-- drawn_cards holds hidden percentages that must be field-stripped in JS
-- before anything is broadcast; see apps/server/src/rooms/stripCards.js).
--
-- NEEDS VERIFICATION against this project's live Supabase Realtime version
-- before relying on it in production -- the realtime.topic()/private-channel
-- API surface has changed shape across Supabase releases. Even if this layer
-- were bypassed entirely, stripCards() having already run before broadcast
-- means hidden percentages still can't leak; this policy layer's job is
-- purely to stop cross-room spoiler leakage (seeing a rival room's board),
-- a separate, independent guarantee.
-- ----------------------------------------------------------------------

drop policy if exists "room topic readable by room members and staff" on realtime.messages;
create policy "room topic readable by room members and staff"
on realtime.messages for select to authenticated
using (
  realtime.topic() like 'room:%'
  and exists (
    select 1 from rooms r
    where r.slug = substring(realtime.topic() from 6)
    and (
      exists (select 1 from profiles p where p.id = auth.uid() and p.app_role in ('host', 'admin'))
      or exists (
        select 1 from syndicate_members sm
        join syndicates s on s.id = sm.syndicate_id
        where sm.user_id = auth.uid() and s.room_id = r.id
      )
    )
  )
);

drop policy if exists "host topic readable by host or admin" on realtime.messages;
create policy "host topic readable by host or admin"
on realtime.messages for select to authenticated
using (
  realtime.topic() like 'host:%'
  and exists (select 1 from profiles p where p.id = auth.uid() and p.app_role in ('host', 'admin'))
);

drop policy if exists "global topic readable by any authenticated user" on realtime.messages;
create policy "global topic readable by any authenticated user"
on realtime.messages for select to authenticated
using (realtime.topic() = 'global');
