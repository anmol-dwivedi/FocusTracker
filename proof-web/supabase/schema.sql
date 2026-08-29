-- PROOF - Supabase schema
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to run more than once.

create table if not exists public.focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_date    date not null,
  started_at      timestamptz not null,
  ended_at        timestamptz,
  planned_seconds integer not null check (planned_seconds > 0),
  actual_seconds  integer check (actual_seconds >= 0),
  status          text not null default 'active'
                    check (status in ('active','completed','ended_early','cancelled')),
  paused_at       timestamptz,
  paused_seconds  integer not null default 0,
  label           text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists focus_sessions_user_date_idx
  on public.focus_sessions (user_id, session_date desc);

create index if not exists focus_sessions_user_status_idx
  on public.focus_sessions (user_id, status);

-- Row Level Security: a signed-in user can only ever see their own rows.
alter table public.focus_sessions enable row level security;

drop policy if exists "own rows: select" on public.focus_sessions;
create policy "own rows: select" on public.focus_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.focus_sessions;
create policy "own rows: insert" on public.focus_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows: update" on public.focus_sessions;
create policy "own rows: update" on public.focus_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows: delete" on public.focus_sessions;
create policy "own rows: delete" on public.focus_sessions
  for delete using (auth.uid() = user_id);
