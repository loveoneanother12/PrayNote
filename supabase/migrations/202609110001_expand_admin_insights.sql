-- Privacy-preserving operational insight groups. No prayer content is returned.
create or replace function public.get_admin_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare result jsonb;
begin
  if not public.is_super_admin() then raise exception 'super_admin_required'; end if;

  with days as (
    select generate_series(
      ((now() at time zone 'Asia/Seoul')::date - 13),
      (now() at time zone 'Asia/Seoul')::date,
      interval '1 day'
    )::date as day
  )
  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'new_users_today', (select count(*) from auth.users where (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date),
    'new_users_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'new_users_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'active_users_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'active_users_30d', (select count(*) from auth.users account where account.last_sign_in_at >= now() - interval '30 days' or exists (select 1 from public.prayer_requests prayer where prayer.author_id = account.id and prayer.created_at >= now() - interval '30 days') or exists (select 1 from public.prayer_responses response where response.user_id = account.id and response.created_at >= now() - interval '30 days')),
    'suspended_users', (select count(*) from auth.users where banned_until > now()),

    'total_groups', (select count(*) from public.groups where deleted_at is null),
    'active_groups_30d', (select count(*) from public.groups app_group where app_group.deleted_at is null and exists (select 1 from public.prayer_group_shares share where share.group_id = app_group.id and share.created_at >= now() - interval '30 days')),
    'dormant_groups_30d', (select count(*) from public.groups app_group where app_group.deleted_at is null and not exists (select 1 from public.prayer_group_shares share where share.group_id = app_group.id and share.created_at >= now() - interval '30 days')),
    'groups_without_leader', (select count(*) from public.groups app_group where app_group.deleted_at is null and not exists (select 1 from public.group_memberships membership where membership.group_id = app_group.id and membership.status = 'active' and membership.role = 'leader')),
    'pending_memberships', (select count(*) from public.group_memberships where status = 'pending'),
    'average_approval_hours', (select coalesce(round(avg(extract(epoch from (reviewed_at - requested_at)) / 3600)::numeric, 1), 0) from public.group_memberships where status = 'active' and reviewed_at is not null and reviewed_at >= now() - interval '30 days'),

    'total_prayers', (select count(*) from public.prayer_requests where deleted_at is null),
    'prayers_7d', (select count(*) from public.prayer_requests where deleted_at is null and created_at >= now() - interval '7 days'),
    'personal_prayers', (select count(*) from public.prayer_requests prayer where prayer.deleted_at is null and not exists (select 1 from public.prayer_group_shares share where share.prayer_id = prayer.id)),
    'group_prayers', (select count(*) from public.prayer_requests prayer where prayer.deleted_at is null and exists (select 1 from public.prayer_group_shares share where share.prayer_id = prayer.id)),
    'resolved_prayers', (select count(*) from public.prayer_requests where deleted_at is null and status = 'completed'),
    'trash_prayers', (select count(*) from public.prayer_requests where deleted_at is not null),
    'prayers_completed_today', (select count(*) from public.prayer_responses where prayed_on = (now() at time zone 'Asia/Seoul')::date),
    'prayer_responses_7d', (select count(*) from public.prayer_responses where created_at >= now() - interval '7 days'),

    'total_challenges', (select count(*) from public.prayer_challenges),
    'active_challenges', (select count(*) from public.prayer_challenges where status in ('scheduled', 'active')),
    'completed_challenges', (select count(*) from public.prayer_challenges where status = 'completed'),
    'successful_challenges', (select count(*) from public.prayer_challenges where status = 'completed' and completed_successfully),
    'challenge_participants', (select count(*) from public.challenge_participants where left_at is null),

    'push_enabled_users', (select count(*) from public.notification_preferences where push_enabled),
    'push_subscribed_users', (select count(distinct user_id) from public.push_subscriptions),
    'notifications_7d', (select count(*) from public.notifications where created_at >= now() - interval '7 days'),
    'unread_notifications', (select count(*) from public.notifications where read_at is null),
    'push_delivered_7d', (select count(*) from public.push_delivery_attempts where status = 'delivered' and attempted_at >= now() - interval '7 days'),
    'push_failed_7d', (select count(*) from public.push_delivery_attempts where status = 'failed' and attempted_at >= now() - interval '7 days'),

    'daily_signups', (select coalesce(jsonb_agg(jsonb_build_object('date', day.day, 'count', coalesce(signups.count, 0)) order by day.day), '[]'::jsonb) from days day left join lateral (select count(*) from auth.users account where (account.created_at at time zone 'Asia/Seoul')::date = day.day) signups on true),
    'daily_prayers', (select coalesce(jsonb_agg(jsonb_build_object('date', day.day, 'count', coalesce(prayers.count, 0)) order by day.day), '[]'::jsonb) from days day left join lateral (select count(*) from public.prayer_requests prayer where (prayer.created_at at time zone 'Asia/Seoul')::date = day.day) prayers on true),
    'daily_responses', (select coalesce(jsonb_agg(jsonb_build_object('date', day.day, 'count', coalesce(responses.count, 0)) order by day.day), '[]'::jsonb) from days day left join lateral (select count(*) from public.prayer_responses response where response.prayed_on = day.day) responses on true)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_admin_insights() from public, anon;
grant execute on function public.get_admin_insights() to authenticated;
notify pgrst, 'reload schema';
