-- Keep the dedicated groups dashboard fast while allowing expired sessions to
-- reach the explicit NULL guard and redirect cleanly to login.

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
        'member_count', (
          select count(*) from public.group_memberships member_count
          where member_count.group_id = app_group.id and member_count.status = 'active'
        ),
        'active_prayer_count', (
          select count(*)
          from public.prayer_group_shares share
          join public.prayer_requests prayer on prayer.id = share.prayer_id
          where share.group_id = app_group.id
            and prayer.status = 'active'
            and prayer.deleted_at is null
            and prayer.hidden_at is null
        ),
        'unread_count', 0
      ) order by membership.created_at, app_group.name)
      from public.group_memberships membership
      join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
      where membership.user_id = auth.uid() and membership.status = 'active'
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.get_dashboard_overview() from public;
grant execute on function public.get_dashboard_overview() to authenticated, anon;

notify pgrst, 'reload schema';
