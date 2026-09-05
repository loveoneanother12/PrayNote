-- Keep dashboard totals aligned with the user's actual scope:
-- their private prayers plus active prayers shared to groups they actively belong to.
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
    join public.groups app_group
      on app_group.id = membership.group_id
     and app_group.deleted_at is null
    where membership.user_id = auth.uid()
      and membership.status = 'active'
  ), scoped_counts as (
    select
      (select count(*) from active_groups) as group_count,
      count(distinct prayer.id) as prayer_count
    from public.prayer_requests prayer
    where prayer.status = 'active'
      and prayer.deleted_at is null
      and prayer.hidden_at is null
      and (
        (
          prayer.author_id = auth.uid()
          and not exists (
            select 1
            from public.prayer_group_shares personal_share
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
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'overview', public.get_dashboard_overview(),
    'counts', jsonb_build_object(
      'group_count', scoped_counts.group_count,
      'prayer_count', scoped_counts.prayer_count
    ),
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
  ) end
  from scoped_counts;
$$;

revoke all on function public.get_dashboard_bundle_fast() from public, anon;
grant execute on function public.get_dashboard_bundle_fast() to authenticated;

notify pgrst, 'reload schema';
