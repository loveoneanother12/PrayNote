-- Expand profile colors and provide an authenticated, atomic account-deletion flow.

alter table public.profiles drop constraint if exists profiles_profile_color_check;
alter table public.profiles add constraint profiles_profile_color_check check (
  profile_color in (
    'indigo', 'sky', 'teal', 'green', 'amber', 'rose', 'violet', 'slate',
    'coral', 'orange', 'lime', 'mint', 'cyan', 'blue', 'navy', 'grape',
    'magenta', 'red', 'brown', 'charcoal'
  )
);

-- Content that remains after withdrawal must not retain a profile foreign key.
alter table public.groups alter column created_by drop not null;
alter table public.groups drop constraint if exists groups_created_by_fkey;
alter table public.groups add constraint groups_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.group_memberships drop constraint if exists group_memberships_reviewed_by_fkey;
alter table public.group_memberships add constraint group_memberships_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.prayer_requests alter column author_id drop not null;
alter table public.prayer_requests drop constraint if exists prayer_requests_author_id_fkey;
alter table public.prayer_requests add constraint prayer_requests_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete set null;

alter table public.prayer_requests drop constraint if exists prayer_requests_hidden_by_fkey;
alter table public.prayer_requests add constraint prayer_requests_hidden_by_fkey
  foreign key (hidden_by) references public.profiles(id) on delete set null;

alter table public.prayer_group_shares alter column shared_by drop not null;
alter table public.prayer_group_shares drop constraint if exists prayer_group_shares_shared_by_fkey;
alter table public.prayer_group_shares add constraint prayer_group_shares_shared_by_fkey
  foreign key (shared_by) references public.profiles(id) on delete set null;

alter table public.audit_logs alter column actor_id drop not null;
alter table public.audit_logs drop constraint if exists audit_logs_actor_id_fkey;
alter table public.audit_logs add constraint audit_logs_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.audit_logs drop constraint if exists audit_logs_target_user_id_fkey;
alter table public.audit_logs add constraint audit_logs_target_user_id_fkey
  foreign key (target_user_id) references public.profiles(id) on delete set null;

create or replace function public.protect_prayer_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.group_id is distinct from old.group_id
     or (new.author_id is distinct from old.author_id and new.author_id is not null) then
    raise exception 'immutable_prayer_ownership';
  end if;

  if (new.hidden_at is distinct from old.hidden_at
      or (new.hidden_by is distinct from old.hidden_by and new.hidden_by is not null))
     and not exists (
       select 1
       from public.prayer_group_shares share
       where share.prayer_id = old.id
         and public.has_group_role(share.group_id, array['admin', 'leader']::public.group_role[])
     ) then
    raise exception 'moderator_permission_required';
  end if;

  return new;
end;
$$;

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
           case
             when prayer.author_id is null then '(탈퇴한 사용자)'
             else coalesce(profile.display_name, '멤버')
           end as display_name
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

create or replace function public.delete_my_account(
  delete_all_prayers boolean default false,
  confirmation text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user uuid := auth.uid();
  led_group record;
  successor uuid;
begin
  if target_user is null then
    raise exception 'authentication_required';
  end if;
  if confirmation is distinct from 'DELETE_MY_ACCOUNT' then
    raise exception 'confirmation_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user::text, 0));
  perform 1 from public.profiles where id = target_user for update;
  if not found then
    raise exception 'account_not_found';
  end if;

  for led_group in
    select membership.group_id
    from public.group_memberships membership
    join public.groups app_group on app_group.id = membership.group_id
    where membership.user_id = target_user
      and membership.status = 'active'
      and membership.role = 'leader'
    for update of membership, app_group
  loop
    select membership.user_id into successor
    from public.group_memberships membership
    where membership.group_id = led_group.group_id
      and membership.user_id <> target_user
      and membership.status = 'active'
    order by case membership.role when 'admin' then 0 else 1 end,
             membership.created_at,
             membership.user_id
    limit 1;

    if successor is null then
      delete from public.groups where id = led_group.group_id;
    else
      update public.group_memberships
      set role = 'leader', updated_at = now()
      where group_id = led_group.group_id and user_id = successor;

      update public.groups
      set created_by = successor, updated_at = now()
      where id = led_group.group_id and created_by = target_user;
    end if;
  end loop;

  if coalesce(delete_all_prayers, false) then
    delete from public.prayer_requests where author_id = target_user;
  else
    delete from public.prayer_requests prayer
    where prayer.author_id = target_user
      and not exists (
        select 1 from public.prayer_group_shares share where share.prayer_id = prayer.id
      );
  end if;

  delete from auth.users where id = target_user;
end;
$$;

revoke all on function public.delete_my_account(boolean, text) from public, anon;
grant execute on function public.delete_my_account(boolean, text) to authenticated;

revoke all on function public.get_prayer_summaries_fast(uuid[], uuid[], uuid, public.prayer_status, text, integer, boolean, boolean, boolean) from public, anon;
grant execute on function public.get_prayer_summaries_fast(uuid[], uuid[], uuid, public.prayer_status, text, integer, boolean, boolean, boolean) to authenticated;
