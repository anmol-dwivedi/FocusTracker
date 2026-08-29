-- PROOF - add pause support to an existing focus_sessions table.
-- Run this once in the Supabase SQL Editor. Safe to run more than once.

alter table public.focus_sessions
  add column if not exists paused_at timestamptz;

alter table public.focus_sessions
  add column if not exists paused_seconds integer not null default 0;

-- Backfill any rows that predate this change.
update public.focus_sessions
   set paused_seconds = 0
 where paused_seconds is null;
