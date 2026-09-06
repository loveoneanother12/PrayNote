-- Keep dashboard counts exact while returning only the three newest cards that
-- the dashboard can display for each group and for personal prayers.
create or replace function public.get_dashboard_bundle_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with active_groups as materialized (
    select membership.group_id, membership.role, membership.created_at
    from public.group_memberships membership
    join public.groups app_group on app_group.id = membership.group_id and app_group.deleted_at is null
    where membership.user_id = auth.uid() and membership.status = 'active'
  ), scoped_counts as materialized (
    select
      (select count(*) from active_groups) as group_count,
      count(distinct prayer.id) as prayer_count,
      count(distinct prayer.id) filter (
        where prayer.author_id = auth.uid()
          and not exists (
            select 1 from public.prayer_group_shares personal_share
            where personal_share.prayer_id = prayer.id
          )
      ) as personal_prayer_count
    from public.prayer_requests prayer
    where prayer.status = 'active'
      and prayer.deleted_at is null
      and prayer.hidden_at is null
      and (
        (
          prayer.author_id = auth.uid()
          and not exists (
            select 1 from public.prayer_group_shares personal_share
            where personal_share.prayer_id = prayer.id
          )
        )
        or exists (
          select 1
          from public.prayer_group_shares group_share
          join active_groups active_group on active_group.group_id = group_share.group_id
          where group_share.prayer_id = prayer.id
        )
      )
  ), overview as materialized (
    select jsonb_build_object(
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
          'role', active_group.role,
          'member_count', (
            select count(*) from public.group_memberships member_count
            where member_count.group_id = app_group.id and member_count.status = 'active'
          ),
          'active_prayer_count', (
            select count(distinct share.prayer_id)
            from public.prayer_group_shares share
            join public.prayer_requests prayer on prayer.id = share.prayer_id
            where share.group_id = app_group.id
              and prayer.status = 'active'
              and prayer.deleted_at is null
              and prayer.hidden_at is null
          ),
          'unread_count', 0
        ) order by active_group.created_at, app_group.name)
        from active_groups active_group
        join public.groups app_group on app_group.id = active_group.group_id
      ), '[]'::jsonb)
    ) as value
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'overview', overview.value,
    'counts', jsonb_build_object(
      'group_count', scoped_counts.group_count,
      'prayer_count', scoped_counts.prayer_count,
      'personal_prayer_count', scoped_counts.personal_prayer_count
    ),
    'group_prayers', coalesce((
      select jsonb_agg(
        to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo'))
        order by prayer.created_at desc
      )
      from active_groups active_group
      cross join lateral public.get_prayer_summaries_fast(
        target_group_ids => array[active_group.group_id],
        target_status => 'active',
        result_limit => 3
      ) prayer
      left join public.profiles author on author.id = prayer.author_id
    ), '[]'::jsonb),
    'personal_prayers', coalesce((
      select jsonb_agg(
        to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo'))
        order by prayer.created_at desc
      )
      from public.get_prayer_summaries_fast(
        target_author_id => auth.uid(),
        target_status => 'active',
        result_limit => 3,
        target_personal_only => true
      ) prayer
      left join public.profiles author on author.id = prayer.author_id
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(notification) order by notification.created_at desc)
      from public.get_notification_summaries_fast(3) notification
    ), '[]'::jsonb)
  ) end
  from scoped_counts, overview;
$$;

revoke all on function public.get_dashboard_bundle_fast() from public, anon;
grant execute on function public.get_dashboard_bundle_fast() to authenticated;

notify pgrst, 'reload schema';
