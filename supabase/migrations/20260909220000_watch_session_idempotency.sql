-- ==============================================================================
-- Migration: 20260909220000_watch_session_idempotency.sql
-- Description: Adds client_session_id and last_checkpoint_at to watch_sessions table
-- for robust idempotency, deduplication, and progress tracking checkpoints.
-- ==============================================================================

-- 1. Add columns to public.watch_sessions if not existing
alter table public.watch_sessions
  add column if not exists client_session_id uuid null,
  add column if not exists last_checkpoint_at timestamptz null;

-- 2. Add partial unique index to prevent duplicate sessions for the same user and client_session_id
create unique index if not exists watch_sessions_user_client_session_unique_idx
  on public.watch_sessions (user_id, client_session_id)
  where client_session_id is not null;

-- 3. Add lookup index for library entry and client session
create index if not exists watch_sessions_entry_client_session_idx
  on public.watch_sessions (library_entry_id, client_session_id);

-- 4. Comments
comment on column public.watch_sessions.client_session_id is 'Client-generated UUID for idempotent session tracking and deduplication.';
comment on column public.watch_sessions.last_checkpoint_at is 'Timestamp of the most recent progress checkpoint received from extension.';
