-- User-selected profile colors and enriched one-round-trip page bundles.

alter table public.profiles
  add column if not exists profile_color text not null default 'indigo';

update public.profiles
set profile_color = 'indigo'
where profile_color not in ('indigo', 'sky', 'teal', 'green', 'amber', 'rose', 'violet', 'slate');

alter table public.profiles drop constraint if exists profiles_profile_color_check;
alter table public.profiles add constraint profiles_profile_color_check
  check (profile_color in ('indigo', 'sky', 'teal', 'green', 'amber', 'rose', 'violet', 'slate'));

create or replace function public.get_my_group_options_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('id', app_group.id, 'name', app_group.name) order by membership.created_at, app_group.name)
    from public.group_memberships membership
    join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
    where membership.user_id = auth.uid() and membership.status = 'active'
  ), '[]'::jsonb) end;
$$;

create or replace function public.get_dashboard_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'unread_count', (
      select count(*) from public.notifications notification
      where notification.recipient_id = auth.uid() and notification.read_at is null
    ),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', app_group.id,
        'name', app_group.name,
        'description', app_group.description,
        'role', membership.role,
        'member_count', (select count(*) from public.group_memberships member_count where member_count.group_id = app_group.id and member_count.status = 'active'),
        'unread_count', 0
      ) order by membership.created_at, app_group.name)
      from public.group_memberships membership
      join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
      where membership.user_id = auth.uid() and membership.status = 'active'
    ), '[]'::jsonb)
  ) end;
$$;

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
    'my_groups', public.get_my_group_options_fast()
  )
  from public.group_memberships membership
  join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
  where auth.uid() is not null
    and membership.group_id = target_group_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
  limit 1;
$$;

create or replace function public.get_group_manage_overview(target_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with viewer as materialized (
    select membership.role
    from public.group_memberships membership
    join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
    where membership.group_id = target_group_id and membership.user_id = auth.uid() and membership.status = 'active'
    limit 1
  )
  select jsonb_build_object(
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'display_profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'role', viewer.role,
    'group', jsonb_build_object('id', app_group.id, 'name', app_group.name, 'description', app_group.description),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', membership.id,
        'user_id', membership.user_id,
        'display_name', profile.display_name,
        'profile_color', profile.profile_color,
        'role', membership.role,
        'status', membership.status,
        'requested_at', membership.requested_at
      ) order by membership.created_at)
      from public.group_memberships membership
      join public.profiles profile on profile.id = membership.user_id
      where membership.group_id = target_group_id
        and (membership.status = 'active' or (viewer.role in ('admin', 'leader') and membership.status = 'pending'))
    ), '[]'::jsonb)
  )
  from viewer
  join public.groups app_group on app_group.id = target_group_id and app_group.deleted_at is null;
$$;

create or replace function public.get_dashboard_bundle_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with active_groups as materialized (
    select membership.group_id
    from public.group_memberships membership
    join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
    where membership.user_id = auth.uid() and membership.status = 'active'
  ), scoped_counts as (
    select (select count(*) from active_groups) as group_count, count(distinct prayer.id) as prayer_count
    from public.prayer_requests prayer
    where prayer.status = 'active' and prayer.deleted_at is null and prayer.hidden_at is null
      and ((prayer.author_id = auth.uid() and not exists (select 1 from public.prayer_group_shares personal_share where personal_share.prayer_id = prayer.id))
        or exists (select 1 from public.prayer_group_shares group_share join active_groups active_group on active_group.group_id = group_share.group_id where group_share.prayer_id = prayer.id))
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'overview', public.get_dashboard_overview(),
    'counts', jsonb_build_object('group_count', scoped_counts.group_count, 'prayer_count', scoped_counts.prayer_count),
    'group_prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo')) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_status => 'active', result_limit => 200, expand_groups => true, member_groups_only => true) prayer
      left join public.profiles author on author.id = prayer.author_id
    ), '[]'::jsonb),
    'personal_prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo')) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_author_id => auth.uid(), target_status => 'active', result_limit => 200, target_personal_only => true) prayer
      left join public.profiles author on author.id = prayer.author_id
    ), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(notification) order by notification.created_at desc) from public.get_notification_summaries_fast(4) notification), '[]'::jsonb)
  ) end from scoped_counts;
$$;

create or replace function public.get_settings_bundle_fast()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'preferences', coalesce((select to_jsonb(preference) from public.notification_preferences preference where preference.user_id = auth.uid()), '{}'::jsonb),
    'unread_count', (select count(*) from public.notifications notification where notification.recipient_id = auth.uid() and notification.read_at is null),
    'reminder_times', coalesce((select jsonb_agg(jsonb_build_object('id', reminder.id, 'time_local', reminder.time_local) order by reminder.time_local) from public.prayer_reminder_times reminder where reminder.user_id = auth.uid()), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_group_page_bundle_fast(target_group_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email', 'overview', public.get_group_page_overview(target_group_id),
    'prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo')) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_group_ids => array[target_group_id], result_limit => 200) prayer
      left join public.profiles author on author.id = prayer.author_id
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_my_prayers_bundle_fast()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'my_groups', public.get_my_group_options_fast(),
    'prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo')) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_author_id => auth.uid(), result_limit => 200) prayer
      left join public.profiles author on author.id = prayer.author_id
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_prayer_detail_bundle_fast(target_prayer_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'my_groups', public.get_my_group_options_fast(),
    'prayer', (select to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo')) from public.get_prayer_summaries_fast(target_prayer_ids => array[target_prayer_id], result_limit => 1) prayer left join public.profiles author on author.id = prayer.author_id limit 1)
  ) end;
$$;

create or replace function public.get_notifications_page_bundle_fast(result_limit integer default 100)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'notifications', coalesce((select jsonb_agg(to_jsonb(notification) order by notification.created_at desc) from public.get_notification_summaries_fast(result_limit) notification), '[]'::jsonb)
  ) end;
$$;

create or replace function public.search_prayers_bundle_fast(target_search text, target_limit integer default 50)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'my_groups', public.get_my_group_options_fast(),
    'prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo')) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_search => nullif(trim(target_search), ''), result_limit => target_limit, member_groups_only => true) prayer
      left join public.profiles author on author.id = prayer.author_id
      where nullif(trim(target_search), '') is not null
    ), '[]'::jsonb)
  ) end;
$$;

-- Every bundle remains private to authenticated users. Row-level policies still
-- restrict direct profile edits to the profile owner and prayer edits to authors.
revoke all on function public.get_my_group_options_fast() from public, anon;
grant execute on function public.get_my_group_options_fast() to authenticated;
revoke all on function public.get_dashboard_overview() from public, anon;
revoke all on function public.get_group_page_overview(uuid) from public, anon;
revoke all on function public.get_group_manage_overview(uuid) from public, anon;
revoke all on function public.get_dashboard_bundle_fast() from public, anon;
revoke all on function public.get_settings_bundle_fast() from public, anon;
revoke all on function public.get_group_page_bundle_fast(uuid) from public, anon;
revoke all on function public.get_my_prayers_bundle_fast() from public, anon;
revoke all on function public.get_prayer_detail_bundle_fast(uuid) from public, anon;
revoke all on function public.get_notifications_page_bundle_fast(integer) from public, anon;
revoke all on function public.search_prayers_bundle_fast(text, integer) from public, anon;
grant execute on function public.get_dashboard_overview() to authenticated;
grant execute on function public.get_group_page_overview(uuid) to authenticated;
grant execute on function public.get_group_manage_overview(uuid) to authenticated;
grant execute on function public.get_dashboard_bundle_fast() to authenticated;
grant execute on function public.get_settings_bundle_fast() to authenticated;
grant execute on function public.get_group_page_bundle_fast(uuid) to authenticated;
grant execute on function public.get_my_prayers_bundle_fast() to authenticated;
grant execute on function public.get_prayer_detail_bundle_fast(uuid) to authenticated;
grant execute on function public.get_notifications_page_bundle_fast(integer) to authenticated;
grant execute on function public.search_prayers_bundle_fast(text, integer) to authenticated;

notify pgrst, 'reload schema';
