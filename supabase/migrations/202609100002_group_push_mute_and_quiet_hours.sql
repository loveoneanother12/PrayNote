-- Per-group push muting and Korea-time quiet hours with one summary push at the end.

alter table public.notification_preferences
  add column if not exists quiet_hours_enabled boolean not null default false,
  add column if not exists quiet_start time not null default '22:00:00',
  add column if not exists quiet_end time not null default '07:00:00';

alter table public.notification_preferences drop constraint if exists notification_preferences_quiet_hours_check;
alter table public.notification_preferences add constraint notification_preferences_quiet_hours_check
  check (not quiet_hours_enabled or quiet_start <> quiet_end);

create table if not exists public.group_push_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  push_muted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

drop trigger if exists group_push_preferences_set_updated_at on public.group_push_preferences;
create trigger group_push_preferences_set_updated_at
before update on public.group_push_preferences
for each row execute function public.set_updated_at();

alter table public.group_push_preferences enable row level security;

drop policy if exists group_push_preferences_select_self on public.group_push_preferences;
create policy group_push_preferences_select_self on public.group_push_preferences
for select to authenticated using (user_id = auth.uid());

drop policy if exists group_push_preferences_insert_self on public.group_push_preferences;
create policy group_push_preferences_insert_self on public.group_push_preferences
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.group_memberships membership
    where membership.user_id = auth.uid()
      and membership.group_id = group_push_preferences.group_id
      and membership.status = 'active'
  )
);

drop policy if exists group_push_preferences_update_self on public.group_push_preferences;
create policy group_push_preferences_update_self on public.group_push_preferences
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists group_push_preferences_delete_self on public.group_push_preferences;
create policy group_push_preferences_delete_self on public.group_push_preferences
for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on table public.group_push_preferences to authenticated;

create table if not exists public.deferred_push_events (
  event_key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  release_at timestamptz not null,
  claimed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deferred_push_events_due_idx
  on public.deferred_push_events(release_at, user_id)
  where released_at is null;

alter table public.deferred_push_events enable row level security;
revoke all on table public.deferred_push_events from anon, authenticated;

create or replace function public.claim_due_quiet_push_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_user_id uuid;
  claimed_release_at timestamptz;
  claimed_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('praynote_quiet_push_summary'));

  select event.user_id, event.release_at
    into claimed_user_id, claimed_release_at
  from public.deferred_push_events event
  where event.released_at is null
    and event.release_at <= now()
    and (event.claimed_at is null or event.claimed_at < now() - interval '5 minutes')
  order by event.release_at, event.created_at
  limit 1
  for update skip locked;

  if claimed_user_id is null then return null; end if;

  update public.deferred_push_events event
  set claimed_at = now()
  where event.user_id = claimed_user_id
    and event.release_at = claimed_release_at
    and event.released_at is null
    and (event.claimed_at is null or event.claimed_at < now() - interval '5 minutes');
  get diagnostics claimed_count = row_count;

  return jsonb_build_object(
    'user_id', claimed_user_id,
    'release_at', claimed_release_at,
    'notification_count', claimed_count
  );
end;
$$;

revoke all on function public.claim_due_quiet_push_summary() from public, anon, authenticated;
grant execute on function public.claim_due_quiet_push_summary() to service_role;

create or replace function public.dispatch_due_quiet_push_summaries()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare webhook_secret text;
begin
  if not exists (
    select 1 from public.deferred_push_events event
    where event.released_at is null
      and event.release_at <= now()
      and (event.claimed_at is null or event.claimed_at < now() - interval '5 minutes')
  ) then return; end if;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  order by created_at desc
  limit 1;

  if webhook_secret is null then raise exception 'push_webhook_secret_missing'; end if;

  perform net.http_post(
    url := 'https://ourpraynote.vercel.app/api/push/quiet-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-praynote-push-secret', webhook_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'praynote-quiet-hours-summaries') then
    perform cron.schedule(
      'praynote-quiet-hours-summaries',
      '* * * * *',
      'select public.dispatch_due_quiet_push_summaries()'
    );
  end if;
end;
$$;

revoke all on function public.dispatch_due_quiet_push_summaries() from public, anon, authenticated;

create or replace function public.get_group_page_overview(target_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'display_profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'role', membership.role,
    'group', jsonb_build_object('id', app_group.id, 'name', app_group.name, 'description', app_group.description, 'invite_code', app_group.invite_code),
    'member_count', (select count(*) from public.group_memberships member_count where member_count.group_id = app_group.id and member_count.status = 'active'),
    'my_groups', public.get_my_group_options_fast(),
    'push_muted', coalesce((
      select preference.push_muted from public.group_push_preferences preference
      where preference.user_id = auth.uid() and preference.group_id = target_group_id
    ), false)
  )
  from public.group_memberships membership
  join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
  where auth.uid() is not null
    and membership.group_id = target_group_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
  limit 1;
$$;

create or replace function public.get_settings_bundle_fast()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'is_super_admin', public.is_super_admin(),
    'preferences', coalesce((select to_jsonb(preference) from public.notification_preferences preference where preference.user_id = auth.uid()), '{}'::jsonb),
    'unread_count', (select count(*) from public.notifications notification where notification.recipient_id = auth.uid() and notification.read_at is null),
    'reminder_times', coalesce((select jsonb_agg(jsonb_build_object('id', reminder.id, 'time_local', reminder.time_local) order by reminder.time_local) from public.prayer_reminder_times reminder where reminder.user_id = auth.uid()), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.get_settings_bundle_fast() from public;
grant execute on function public.get_settings_bundle_fast() to authenticated, anon;

notify pgrst, 'reload schema';
