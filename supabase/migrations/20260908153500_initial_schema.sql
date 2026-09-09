-- ==============================================================================
-- VRATE INITIAL SCHEMA MIGRATION
-- Step 2: Foundation for Supabase, RLS, triggers, indexes, and constraints
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Custom Enum Types
-- ------------------------------------------------------------------------------
create type public.media_type as enum (
  'movie',
  'series'
);

create type public.metadata_provider as enum (
  'tmdb',
  'anilist'
);

create type public.library_status as enum (
  'watchlist',
  'watching',
  'completed',
  'paused',
  'dropped'
);

-- ------------------------------------------------------------------------------
-- 2. Table: public.profiles
-- ------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public user profiles linked to auth.users.';

-- ------------------------------------------------------------------------------
-- 3. Table: public.media
-- ------------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  media_type public.media_type not null,
  title text not null,
  original_title text null,
  overview text null,
  poster_url text null,
  backdrop_url text null,
  release_date date null,
  release_year integer null,
  runtime_minutes integer null,
  total_seasons integer null,
  total_episodes integer null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_title_not_empty check (length(trim(title)) > 0),
  constraint media_runtime_positive check (runtime_minutes is null or runtime_minutes > 0),
  constraint media_total_seasons_non_negative check (total_seasons is null or total_seasons >= 0),
  constraint media_total_episodes_non_negative check (total_episodes is null or total_episodes >= 0),
  constraint media_release_year_reasonable check (release_year is null or (release_year >= 1880 and release_year <= 2100))
);

comment on table public.media is 'Global catalog of movies, series, and anime.';

-- ------------------------------------------------------------------------------
-- 4. Table: public.media_external_ids
-- ------------------------------------------------------------------------------
create table public.media_external_ids (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  provider public.metadata_provider not null,
  external_id text not null,
  created_at timestamptz not null default now(),

  constraint media_external_id_not_empty check (length(trim(external_id)) > 0),
  constraint media_external_ids_provider_external_id_key unique (provider, external_id),
  constraint media_external_ids_media_id_provider_key unique (media_id, provider)
);

comment on table public.media_external_ids is 'Mapping of external provider IDs (TMDB, AniList) to canonical media.';

-- ------------------------------------------------------------------------------
-- 5. Table: public.library_entries
-- ------------------------------------------------------------------------------
create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  status public.library_status not null default 'watchlist',
  rating numeric(3,1) null,
  is_favorite boolean not null default false,
  notes text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  last_watched_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint library_entries_user_media_unique unique (user_id, media_id),
  constraint library_entries_rating_range check (rating is null or (rating >= 0.0 and rating <= 10.0)),
  constraint library_entries_rating_step check (rating is null or (rating * 2 = floor(rating * 2)))
);

comment on table public.library_entries is 'User library watchlist, tracking state, and ratings.';

-- ------------------------------------------------------------------------------
-- 6. Table: public.episode_progress
-- ------------------------------------------------------------------------------
create table public.episode_progress (
  id uuid primary key default gen_random_uuid(),
  library_entry_id uuid not null references public.library_entries(id) on delete cascade,
  season_number integer null,
  episode_number integer not null default 1,
  progress_seconds integer not null default 0,
  duration_seconds integer null,
  progress_percent numeric(5,2) not null default 0,
  is_completed boolean not null default false,
  last_source_name text null,
  last_source_url text null,
  last_watched_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint episode_progress_season_non_negative check (season_number is null or season_number >= 0),
  constraint episode_progress_episode_min check (episode_number >= 1),
  constraint episode_progress_seconds_non_negative check (progress_seconds >= 0),
  constraint episode_progress_duration_positive check (duration_seconds is null or duration_seconds > 0),
  constraint episode_progress_percent_range check (progress_percent >= 0.00 and progress_percent <= 100.00)
);

create unique index episode_progress_entry_season_ep_idx
  on public.episode_progress (library_entry_id, coalesce(season_number, 0), episode_number);

comment on table public.episode_progress is 'Detailed playback and progress for individual episodes/movies.';

-- ------------------------------------------------------------------------------
-- 7. Table: public.watch_sessions
-- ------------------------------------------------------------------------------
create table public.watch_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  library_entry_id uuid not null references public.library_entries(id) on delete cascade,
  episode_progress_id uuid null references public.episode_progress(id) on delete set null,
  source_name text not null,
  source_domain text null,
  source_url text null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  watched_seconds integer not null default 0,
  created_at timestamptz not null default now(),

  constraint watch_sessions_source_name_not_empty check (length(trim(source_name)) > 0),
  constraint watch_sessions_watched_seconds_non_negative check (watched_seconds >= 0),
  constraint watch_sessions_ended_at_after_started_at check (ended_at is null or ended_at >= started_at)
);

comment on table public.watch_sessions is 'Playback session logs captured from web streaming platforms.';

-- ------------------------------------------------------------------------------
-- 8. Table: public.user_settings
-- ------------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  auto_detect boolean not null default true,
  confirm_before_tracking boolean not null default true,
  auto_track_progress boolean not null default true,
  auto_complete_threshold integer not null default 90,
  auto_add_after_seconds integer not null default 30,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_settings_threshold_range check (auto_complete_threshold >= 50 and auto_complete_threshold <= 100),
  constraint user_settings_add_after_seconds_range check (auto_add_after_seconds >= 5 and auto_add_after_seconds <= 600),
  constraint user_settings_theme_valid check (theme in ('dark', 'light', 'system'))
);

comment on table public.user_settings is 'User-level application and extension preferences.';

-- ------------------------------------------------------------------------------
-- 9. Table: public.site_preferences
-- ------------------------------------------------------------------------------
create table public.site_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  tracking_enabled boolean not null default true,
  confirm_before_tracking boolean not null default true,
  auto_add boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_preferences_domain_not_empty check (length(trim(domain)) > 0),
  constraint site_preferences_user_domain_unique unique (user_id, domain)
);

comment on table public.site_preferences is 'Domain-specific tracking preferences (e.g. miruro.bz, netflix.com).';

-- ------------------------------------------------------------------------------
-- 10. Functions & Triggers
-- ------------------------------------------------------------------------------

-- Reusable updated_at updater
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_media_updated_at
  before update on public.media
  for each row execute function public.handle_updated_at();

create trigger set_library_entries_updated_at
  before update on public.library_entries
  for each row execute function public.handle_updated_at();

create trigger set_episode_progress_updated_at
  before update on public.episode_progress
  for each row execute function public.handle_updated_at();

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

create trigger set_site_preferences_updated_at
  before update on public.site_preferences
  for each row execute function public.handle_updated_at();

-- Auto-provision profile and user_settings on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Automatically provision profile
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do nothing;

  -- Automatically provision default user settings
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 11. Indexes for Foreign Keys, Queries, and RLS Performance
-- ------------------------------------------------------------------------------
create index media_type_idx on public.media (media_type);
create index media_release_year_idx on public.media (release_year);

create index media_external_ids_media_id_idx on public.media_external_ids (media_id);
create index media_external_ids_provider_ext_idx on public.media_external_ids (provider, external_id);

create index library_entries_user_id_idx on public.library_entries (user_id);
create index library_entries_media_id_idx on public.library_entries (media_id);
create index library_entries_user_status_idx on public.library_entries (user_id, status);
create index library_entries_user_last_watched_idx on public.library_entries (user_id, last_watched_at desc nulls last);

create index episode_progress_library_entry_id_idx on public.episode_progress (library_entry_id);

create index watch_sessions_user_id_idx on public.watch_sessions (user_id);
create index watch_sessions_library_entry_id_idx on public.watch_sessions (library_entry_id);
create index watch_sessions_user_started_idx on public.watch_sessions (user_id, started_at desc);

create index site_preferences_user_id_idx on public.site_preferences (user_id);

-- ------------------------------------------------------------------------------
-- 12. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.media enable row level security;
alter table public.media_external_ids enable row level security;
alter table public.library_entries enable row level security;
alter table public.episode_progress enable row level security;
alter table public.watch_sessions enable row level security;
alter table public.user_settings enable row level security;
alter table public.site_preferences enable row level security;

-- 12.1 profiles: users can select and update their own profile
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 12.2 media: authenticated users can read the catalog
create policy "media_select_authenticated"
  on public.media
  for select
  to authenticated
  using (true);

-- 12.3 media_external_ids: authenticated users can read external mappings
create policy "media_external_ids_select_authenticated"
  on public.media_external_ids
  for select
  to authenticated
  using (true);

-- 12.4 library_entries: users have full CRUD on their own entries
create policy "library_entries_select_own"
  on public.library_entries
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "library_entries_insert_own"
  on public.library_entries
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "library_entries_update_own"
  on public.library_entries
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "library_entries_delete_own"
  on public.library_entries
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- 12.5 episode_progress: users have CRUD only on progress for entries they own
create policy "episode_progress_select_own"
  on public.episode_progress
  for select
  to authenticated
  using (
    exists (
      select 1 from public.library_entries le
      where le.id = episode_progress.library_entry_id
        and le.user_id = (select auth.uid())
    )
  );

create policy "episode_progress_insert_own"
  on public.episode_progress
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.library_entries le
      where le.id = episode_progress.library_entry_id
        and le.user_id = (select auth.uid())
    )
  );

create policy "episode_progress_update_own"
  on public.episode_progress
  for update
  to authenticated
  using (
    exists (
      select 1 from public.library_entries le
      where le.id = episode_progress.library_entry_id
        and le.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.library_entries le
      where le.id = episode_progress.library_entry_id
        and le.user_id = (select auth.uid())
    )
  );

create policy "episode_progress_delete_own"
  on public.episode_progress
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.library_entries le
      where le.id = episode_progress.library_entry_id
        and le.user_id = (select auth.uid())
    )
  );

-- 12.6 watch_sessions: users have CRUD only on their own sessions for their own library entries
create policy "watch_sessions_select_own"
  on public.watch_sessions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.library_entries le
      where le.id = watch_sessions.library_entry_id
        and le.user_id = (select auth.uid())
    )
  );

create policy "watch_sessions_insert_own"
  on public.watch_sessions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.library_entries le
      where le.id = watch_sessions.library_entry_id
        and le.user_id = (select auth.uid())
    )
    and (
      episode_progress_id is null
      or exists (
        select 1 from public.episode_progress ep
        where ep.id = watch_sessions.episode_progress_id
          and ep.library_entry_id = watch_sessions.library_entry_id
      )
    )
  );

create policy "watch_sessions_update_own"
  on public.watch_sessions
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.library_entries le
      where le.id = watch_sessions.library_entry_id
        and le.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.library_entries le
      where le.id = watch_sessions.library_entry_id
        and le.user_id = (select auth.uid())
    )
    and (
      episode_progress_id is null
      or exists (
        select 1 from public.episode_progress ep
        where ep.id = watch_sessions.episode_progress_id
          and ep.library_entry_id = watch_sessions.library_entry_id
      )
    )
  );

create policy "watch_sessions_delete_own"
  on public.watch_sessions
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.library_entries le
      where le.id = watch_sessions.library_entry_id
        and le.user_id = (select auth.uid())
    )
  );

-- 12.7 user_settings: select and update own settings
create policy "user_settings_select_own"
  on public.user_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_settings_update_own"
  on public.user_settings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 12.8 site_preferences: full CRUD on own domain preferences
create policy "site_preferences_select_own"
  on public.site_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "site_preferences_insert_own"
  on public.site_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "site_preferences_update_own"
  on public.site_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "site_preferences_delete_own"
  on public.site_preferences
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------------------
-- 13. Grants & Security Privileges
-- ------------------------------------------------------------------------------
-- Revoke all public privileges from anon and authenticated
revoke all on all tables in schema public from anon, authenticated;
revoke all on all routines in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Minimal grants for authenticated role
grant select on public.media to authenticated;
grant select on public.media_external_ids to authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.user_settings to authenticated;

grant select, insert, update, delete on public.library_entries to authenticated;
grant select, insert, update, delete on public.episode_progress to authenticated;
grant select, insert, update, delete on public.watch_sessions to authenticated;
grant select, insert, update, delete on public.site_preferences to authenticated;

grant execute on function public.handle_updated_at to authenticated;
