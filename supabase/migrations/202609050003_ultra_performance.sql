-- Bundle the hottest screens so each render crosses the network only once.

create or replace function public.get_dashboard_bundle_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'overview', public.get_dashboard_overview(),
    'group_prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(
        target_status => 'active',
        result_limit => 200,
        expand_groups => true,
        member_groups_only => true
      ) prayer
    ), '[]'::jsonb),
    'personal_prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(
        target_author_id => auth.uid(),
        target_status => 'active',
        result_limit => 200,
        target_personal_only => true
      ) prayer
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(notification) order by notification.created_at desc)
      from public.get_notification_summaries_fast(4) notification
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_settings_bundle_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'preferences', coalesce((
      select to_jsonb(preference)
      from public.notification_preferences preference
      where preference.user_id = auth.uid()
    ), '{}'::jsonb),
    'unread_count', (
      select count(*) from public.notifications notification
      where notification.recipient_id = auth.uid() and notification.read_at is null
    ),
    'reminder_times', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', reminder.id, 'time_local', reminder.time_local)
        order by reminder.time_local
      )
      from public.prayer_reminder_times reminder
      where reminder.user_id = auth.uid()
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_group_page_bundle_fast(target_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'overview', public.get_group_page_overview(target_group_id),
    'prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_group_ids => array[target_group_id], result_limit => 200) prayer
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_my_prayers_bundle_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_author_id => auth.uid(), result_limit => 200) prayer
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_prayer_detail_bundle_fast(target_prayer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'prayer', (
      select to_jsonb(prayer)
      from public.get_prayer_summaries_fast(target_prayer_ids => array[target_prayer_id], result_limit => 1) prayer
      limit 1
    )
  ) end;
$$;

create or replace function public.get_notifications_page_bundle_fast(result_limit integer default 100)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(notification) order by notification.created_at desc)
      from public.get_notification_summaries_fast(result_limit) notification
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.search_prayers_bundle_fast(target_search text, target_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(
        target_search => nullif(trim(target_search), ''),
        result_limit => target_limit,
        member_groups_only => true
      ) prayer
      where nullif(trim(target_search), '') is not null
    ), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_group_manage_bundle_fast(target_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'overview', public.get_group_manage_overview(target_group_id)
  ) end;
$$;

create or replace function public.get_join_page_bundle_fast(target_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'authenticated', auth.uid() is not null,
    'preview', (
      select to_jsonb(preview)
      from public.get_join_group_preview(target_group_id) preview
      limit 1
    ),
    'membership_status', (
      select membership.status
      from public.group_memberships membership
      where membership.group_id = target_group_id and membership.user_id = auth.uid()
      limit 1
    )
  );
$$;

revoke all on function public.get_dashboard_bundle_fast() from public, anon;
revoke all on function public.get_settings_bundle_fast() from public, anon;
revoke all on function public.get_group_page_bundle_fast(uuid) from public, anon;
revoke all on function public.get_my_prayers_bundle_fast() from public, anon;
revoke all on function public.get_prayer_detail_bundle_fast(uuid) from public, anon;
revoke all on function public.get_notifications_page_bundle_fast(integer) from public, anon;
revoke all on function public.search_prayers_bundle_fast(text, integer) from public, anon;
revoke all on function public.get_group_manage_bundle_fast(uuid) from public, anon;
revoke all on function public.get_join_page_bundle_fast(uuid) from public, anon;
grant execute on function public.get_dashboard_bundle_fast() to authenticated;
grant execute on function public.get_settings_bundle_fast() to authenticated;
grant execute on function public.get_group_page_bundle_fast(uuid) to authenticated;
grant execute on function public.get_my_prayers_bundle_fast() to authenticated;
grant execute on function public.get_prayer_detail_bundle_fast(uuid) to authenticated;
grant execute on function public.get_notifications_page_bundle_fast(integer) to authenticated;
grant execute on function public.search_prayers_bundle_fast(text, integer) to authenticated;
grant execute on function public.get_group_manage_bundle_fast(uuid) to authenticated;
grant execute on function public.get_join_page_bundle_fast(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
