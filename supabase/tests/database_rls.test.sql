-- ==============================================================================
-- VRATE DATABASE RLS & INTEGRITY TESTS
-- Automated tests using transaction rollback for isolated validation
-- ==============================================================================

begin;

-- Create test helper assertion function
create or replace function pg_temp.assert(condition boolean, message text)
returns void as $$
begin
  if not condition then
    raise exception 'TEST FAILED: %', message;
  end if;
end;
$$ language plpgsql;

-- ------------------------------------------------------------------------------
-- Setup Test Fixtures
-- ------------------------------------------------------------------------------
do $$
declare
  v_user_a_id uuid := '11111111-1111-4111-a111-111111111111'::uuid;
  v_user_b_id uuid := '22222222-2222-4222-a222-222222222222'::uuid;
  v_media_1_id uuid;
  v_entry_a_id uuid;
  v_entry_b_id uuid;
  v_progress_a_id uuid;
  v_count integer;
  v_err_occurred boolean := false;
begin
  -- ----------------------------------------------------------------------------
  -- TEST 9: Profile dan settings terbentuk otomatis saat auth.users dibuat
  -- ----------------------------------------------------------------------------
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_user_a_id, 'user_a@example.com', '{"name": "User Alpha"}'::jsonb),
    (v_user_b_id, 'user_b@example.com', '{"name": "User Beta"}'::jsonb);

  perform pg_temp.assert(
    exists (select 1 from public.profiles where id = v_user_a_id and display_name = 'User Alpha'),
    'Test 9A: Profile must be auto-created by auth trigger'
  );
  perform pg_temp.assert(
    exists (select 1 from public.user_settings where user_id = v_user_a_id and auto_detect = true),
    'Test 9B: User settings must be auto-created by auth trigger'
  );

  -- Seed canonical media catalog using service role / postgres
  insert into public.media (media_type, title, release_year)
  values ('series', 'KonoSuba', 2016)
  returning id into v_media_1_id;

  insert into public.media_external_ids (media_id, provider, external_id)
  values (v_media_1_id, 'anilist', '102976');

  -- ----------------------------------------------------------------------------
  -- TEST 10: Unique constraints provider ID dan library entry berfungsi
  -- ----------------------------------------------------------------------------
  v_err_occurred := false;
  begin
    insert into public.media_external_ids (media_id, provider, external_id)
    values (v_media_1_id, 'anilist', '102976');
  exception when unique_violation then
    v_err_occurred := true;
  end;
  perform pg_temp.assert(v_err_occurred, 'Test 10A: Duplicate (provider, external_id) must be rejected');

  -- ----------------------------------------------------------------------------
  -- TEST 1: Anonymous user tidak dapat membaca data aplikasi
  -- ----------------------------------------------------------------------------
  set local role anon;
  set local request.jwt.claim.sub to '';

  select count(*) into v_count from public.profiles;
  perform pg_temp.assert(v_count = 0, 'Test 1A: anon role cannot read profiles');

  select count(*) into v_count from public.media;
  perform pg_temp.assert(v_count = 0, 'Test 1B: anon role cannot read media');

  select count(*) into v_count from public.library_entries;
  perform pg_temp.assert(v_count = 0, 'Test 1C: anon role cannot read library_entries');

  -- ----------------------------------------------------------------------------
  -- TEST 7 & 8: Authenticated user dapat membaca media tetapi TIDAK dapat menulis
  -- ----------------------------------------------------------------------------
  set local role authenticated;
  set local request.jwt.claim.sub to '11111111-1111-4111-a111-111111111111';

  select count(*) into v_count from public.media;
  perform pg_temp.assert(v_count >= 1, 'Test 7: Authenticated user can read media catalog');

  v_err_occurred := false;
  begin
    insert into public.media (media_type, title) values ('movie', 'Illegal Insert');
  exception when insufficient_privilege then
    v_err_occurred := true;
  end;
  perform pg_temp.assert(v_err_occurred, 'Test 8: Authenticated user cannot insert directly into media');

  -- ----------------------------------------------------------------------------
  -- TEST 2: User A dapat membaca dan mengubah data miliknya
  -- ----------------------------------------------------------------------------
  insert into public.library_entries (user_id, media_id, status)
  values (v_user_a_id, v_media_1_id, 'watching')
  returning id into v_entry_a_id;

  perform pg_temp.assert(
    exists (select 1 from public.library_entries where id = v_entry_a_id and user_id = v_user_a_id),
    'Test 2A: User A can read own library entry'
  );

  update public.library_entries
  set status = 'completed', rating = 9.5
  where id = v_entry_a_id;

  perform pg_temp.assert(
    exists (select 1 from public.library_entries where id = v_entry_a_id and status = 'completed' and rating = 9.5),
    'Test 2B: User A can update own library entry'
  );

  insert into public.episode_progress (library_entry_id, season_number, episode_number, progress_percent)
  values (v_entry_a_id, 1, 1, 100.0)
  returning id into v_progress_a_id;

  perform pg_temp.assert(v_progress_a_id is not null, 'Test 2C: User A can create episode progress');

  -- Seed User B entry as postgres/service role
  reset role;
  insert into public.library_entries (user_id, media_id, status)
  values (v_user_b_id, v_media_1_id, 'watchlist')
  returning id into v_entry_b_id;

  -- ----------------------------------------------------------------------------
  -- TEST 3: User A tidak dapat membaca atau mengubah library User B
  -- ----------------------------------------------------------------------------
  set local role authenticated;
  set local request.jwt.claim.sub to '11111111-1111-4111-a111-111111111111';

  select count(*) into v_count from public.library_entries where id = v_entry_b_id;
  perform pg_temp.assert(v_count = 0, 'Test 3A: User A cannot select User B library entry');

  update public.library_entries set status = 'dropped' where id = v_entry_b_id;
  reset role;
  select count(*) into v_count from public.library_entries where id = v_entry_b_id and status = 'dropped';
  perform pg_temp.assert(v_count = 0, 'Test 3B: User A cannot update User B library entry');

  -- ----------------------------------------------------------------------------
  -- TEST 4: User A tidak dapat memasukkan library_entry dengan user_id milik User B
  -- ----------------------------------------------------------------------------
  set local role authenticated;
  set local request.jwt.claim.sub to '11111111-1111-4111-a111-111111111111';

  v_err_occurred := false;
  begin
    insert into public.library_entries (user_id, media_id, status)
    values (v_user_b_id, v_media_1_id, 'watchlist');
  exception when others then
    v_err_occurred := true;
  end;
  perform pg_temp.assert(v_err_occurred, 'Test 4: User A cannot insert library entry for User B');

  -- ----------------------------------------------------------------------------
  -- TEST 5: User A tidak dapat mengakses episode_progress milik User B
  -- ----------------------------------------------------------------------------
  v_err_occurred := false;
  begin
    insert into public.episode_progress (library_entry_id, episode_number)
    values (v_entry_b_id, 1);
  exception when others then
    v_err_occurred := true;
  end;
  perform pg_temp.assert(v_err_occurred, 'Test 5: User A cannot insert progress for User B library entry');

  -- ----------------------------------------------------------------------------
  -- TEST 6: User A tidak dapat membuat watch_sessions untuk library User B
  -- ----------------------------------------------------------------------------
  v_err_occurred := false;
  begin
    insert into public.watch_sessions (user_id, library_entry_id, source_name)
    values (v_user_a_id, v_entry_b_id, 'miruro');
  exception when others then
    v_err_occurred := true;
  end;
  perform pg_temp.assert(v_err_occurred, 'Test 6: User A cannot create watch session with User B library_entry_id');

end;
$$;

rollback;
