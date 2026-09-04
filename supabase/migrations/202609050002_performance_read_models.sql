-- Collapse the main application read models into one database round trip each.

create index if not exists prayer_requests_visible_status_created_idx
  on public.prayer_requests(status, created_at desc)
  where deleted_at is null and hidden_at is null;

create index if not exists prayer_group_shares_prayer_created_idx
  on public.prayer_group_shares(prayer_id, created_at, group_id);

create index if not exists prayer_responses_prayer_date_user_idx
  on public.prayer_responses(prayer_id, prayed_on, user_id);

create or replace function public.get_prayer_summaries_fast(
  target_group_ids uuid[] default null,
  target_prayer_ids uuid[] default null,
  target_author_id uuid default null,
  target_status public.prayer_status default null,
  target_search text default null,
  result_limit integer default null,
  target_personal_only boolean default false,
  expand_groups boolean default false,
  member_groups_only boolean default false
)
returns table (
  id uuid,
  group_id uuid,
  group_name text,
  group_ids uuid[],
  group_names text[],
  is_personal boolean,
  author_id uuid,
  author_name text,
  content text,
  status public.prayer_status,
  response_count bigint,
  has_prayed boolean,
  created_at timestamptz,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with candidate_prayers as materialized (
    select prayer.*
    from public.prayer_requests prayer
    where prayer.deleted_at is null
      and prayer.hidden_at is null
      and public.can_access_prayer(prayer.id, auth.uid())
      and (target_prayer_ids is null or prayer.id = any(target_prayer_ids))
      and (target_author_id is null or prayer.author_id = target_author_id)
      and (target_status is null or prayer.status = target_status)
      and (target_search is null or prayer.content ilike '%' || target_search || '%')
      and (
        target_group_ids is null
        or exists (
          select 1
          from public.prayer_group_shares requested_share
          where requested_share.prayer_id = prayer.id
            and requested_share.group_id = any(target_group_ids)
        )
      )
      and (
        not target_personal_only
        or not exists (
          select 1 from public.prayer_group_shares personal_share
          where personal_share.prayer_id = prayer.id
        )
      )
      and (
        not member_groups_only
        or exists (
          select 1
          from public.prayer_group_shares member_share
          join public.group_memberships member_membership
            on member_membership.group_id = member_share.group_id
           and member_membership.user_id = auth.uid()
           and member_membership.status = 'active'
          where member_share.prayer_id = prayer.id
        )
      )
    order by prayer.created_at desc
    limit coalesce(least(greatest(result_limit, 1), 200), 2147483647)
  ),
  visible_shares as materialized (
    select share.prayer_id, share.group_id, app_group.name, share.created_at
    from public.prayer_group_shares share
    join candidate_prayers prayer on prayer.id = share.prayer_id
    join public.groups app_group on app_group.id = share.group_id and app_group.deleted_at is null
    where (not member_groups_only and prayer.author_id = auth.uid())
       or exists (
         select 1
         from public.group_memberships membership
         where membership.group_id = share.group_id
           and membership.user_id = auth.uid()
           and membership.status = 'active'
       )
  ),
  share_rollups as (
    select share.prayer_id,
           array_agg(share.group_id order by share.created_at, share.group_id) as group_ids,
           array_agg(share.name order by share.created_at, share.group_id) as group_names
    from visible_shares share
    group by share.prayer_id
  ),
  response_rollups as (
    select response.prayer_id,
           count(*) as response_count,
           bool_or(
             response.user_id = auth.uid()
             and response.prayed_on = (now() at time zone 'Asia/Seoul')::date
           ) as has_prayed
    from public.prayer_responses response
    join candidate_prayers prayer on prayer.id = response.prayer_id
    group by response.prayer_id
  ),
  base_rows as (
    select prayer.*,
           coalesce(shares.group_ids, array[]::uuid[]) as visible_group_ids,
           coalesce(shares.group_names, array[]::text[]) as visible_group_names,
           coalesce(responses.response_count, 0) as total_responses,
           coalesce(responses.has_prayed, false) as prayed_today,
           coalesce(profile.display_name, '멤버') as display_name
    from candidate_prayers prayer
    left join share_rollups shares on shares.prayer_id = prayer.id
    left join response_rollups responses on responses.prayer_id = prayer.id
    left join public.profiles profile on profile.id = prayer.author_id
  )
  select output.id, output.group_id, output.group_name, output.group_ids, output.group_names,
         output.is_personal, output.author_id, output.author_name, output.content, output.status,
         output.response_count, output.has_prayed, output.created_at, output.completed_at
  from (
    select prayer.id,
           primary_share.group_id,
           case
             when cardinality(prayer.visible_group_names) = 0 then '개인기도'
             when cardinality(prayer.visible_group_names) = 1 then prayer.visible_group_names[1]
             else prayer.visible_group_names[1] || ' 외 ' || (cardinality(prayer.visible_group_names) - 1)::text || '개 그룹'
           end as group_name,
           prayer.visible_group_ids as group_ids,
           prayer.visible_group_names as group_names,
           cardinality(prayer.visible_group_ids) = 0 as is_personal,
           prayer.author_id,
           prayer.display_name as author_name,
           prayer.content,
           prayer.status,
           prayer.total_responses as response_count,
           prayer.prayed_today as has_prayed,
           prayer.created_at,
           prayer.completed_at
    from base_rows prayer
    left join lateral (
      select share.group_id
      from visible_shares share
      where share.prayer_id = prayer.id
        and (target_group_ids is null or share.group_id = any(target_group_ids))
      order by share.created_at, share.group_id
      limit 1
    ) primary_share on true
    where not expand_groups

    union all

    select prayer.id,
           share.group_id,
           share.name as group_name,
           prayer.visible_group_ids as group_ids,
           prayer.visible_group_names as group_names,
           false as is_personal,
           prayer.author_id,
           prayer.display_name as author_name,
           prayer.content,
           prayer.status,
           prayer.total_responses as response_count,
           prayer.prayed_today as has_prayed,
           prayer.created_at,
           prayer.completed_at
    from base_rows prayer
    join visible_shares share on share.prayer_id = prayer.id
    where expand_groups
      and (target_group_ids is null or share.group_id = any(target_group_ids))
      and exists (
        select 1
        from public.group_memberships expansion_membership
        where expansion_membership.group_id = share.group_id
          and expansion_membership.user_id = auth.uid()
          and expansion_membership.status = 'active'
      )
  ) output
  order by output.created_at desc;
$$;

create or replace function public.get_notification_summaries_fast(result_limit integer default 50)
returns table (
  id uuid,
  actor_id uuid,
  group_id uuid,
  prayer_id uuid,
  type public.notification_type,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz,
  actor_name text,
  group_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select notification.id,
         notification.actor_id,
         notification.group_id,
         notification.prayer_id,
         notification.type,
         notification.data,
         notification.read_at,
         notification.created_at,
         actor.display_name as actor_name,
         app_group.name as group_name
  from public.notifications notification
  left join public.profiles actor on actor.id = notification.actor_id
  left join public.groups app_group on app_group.id = notification.group_id
  where auth.uid() is not null
    and notification.recipient_id = auth.uid()
  order by notification.created_at desc
  limit least(greatest(coalesce(result_limit, 50), 1), 200);
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
    'unread_count', (
      select count(*) from public.notifications notification
      where notification.recipient_id = auth.uid() and notification.read_at is null
    ),
    'groups', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', app_group.id,
          'name', app_group.name,
          'description', app_group.description,
          'role', membership.role,
          'member_count', (
            select count(*) from public.group_memberships member_count
            where member_count.group_id = app_group.id and member_count.status = 'active'
          ),
          'unread_count', 0
        )
        order by membership.created_at, app_group.name
      )
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
    'role', membership.role,
    'group', jsonb_build_object(
      'id', app_group.id,
      'name', app_group.name,
      'description', app_group.description,
      'invite_code', app_group.invite_code
    ),
    'member_count', (
      select count(*) from public.group_memberships member_count
      where member_count.group_id = app_group.id and member_count.status = 'active'
    ),
    'my_groups', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', my_group.id, 'name', my_group.name)
        order by my_membership.created_at, my_group.name
      )
      from public.group_memberships my_membership
      join public.groups my_group on my_group.id = my_membership.group_id and my_group.deleted_at is null
      where my_membership.user_id = auth.uid() and my_membership.status = 'active'
    ), '[]'::jsonb)
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
    where membership.group_id = target_group_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
    limit 1
  )
  select jsonb_build_object(
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'role', viewer.role,
    'group', jsonb_build_object(
      'id', app_group.id,
      'name', app_group.name,
      'description', app_group.description
    ),
    'memberships', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', membership.id,
          'user_id', membership.user_id,
          'display_name', profile.display_name,
          'role', membership.role,
          'status', membership.status,
          'requested_at', membership.requested_at
        )
        order by membership.created_at
      )
      from public.group_memberships membership
      join public.profiles profile on profile.id = membership.user_id
      where membership.group_id = target_group_id
        and (
          membership.status = 'active'
          or (viewer.role in ('admin', 'leader') and membership.status = 'pending')
        )
    ), '[]'::jsonb)
  )
  from viewer
  join public.groups app_group on app_group.id = target_group_id and app_group.deleted_at is null;
$$;

revoke all on function public.get_prayer_summaries_fast(uuid[], uuid[], uuid, public.prayer_status, text, integer, boolean, boolean, boolean) from public, anon;
revoke all on function public.get_notification_summaries_fast(integer) from public, anon;
revoke all on function public.get_dashboard_overview() from public, anon;
revoke all on function public.get_group_page_overview(uuid) from public, anon;
revoke all on function public.get_group_manage_overview(uuid) from public, anon;

grant execute on function public.get_prayer_summaries_fast(uuid[], uuid[], uuid, public.prayer_status, text, integer, boolean, boolean, boolean) to authenticated;
grant execute on function public.get_notification_summaries_fast(integer) to authenticated;
grant execute on function public.get_dashboard_overview() to authenticated;
grant execute on function public.get_group_page_overview(uuid) to authenticated;
grant execute on function public.get_group_manage_overview(uuid) to authenticated;
