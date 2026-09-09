-- Super-admin center: aggregate insights, member management, and immutable action history.

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid,
  target_email text,
  action text not null check (action in ('user.suspended', 'user.unsuspended', 'user.signed_out', 'user.deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_logs_created_idx
  on public.admin_action_logs(created_at desc);

alter table public.admin_action_logs enable row level security;
revoke all on table public.admin_action_logs from public, anon, authenticated;

create or replace function public.get_admin_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required';
  end if;

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
    'active_users_30d', (
      select count(*) from auth.users account
      where account.last_sign_in_at >= now() - interval '30 days'
         or exists (select 1 from public.prayer_requests prayer where prayer.author_id = account.id and prayer.created_at >= now() - interval '30 days')
         or exists (select 1 from public.prayer_responses response where response.user_id = account.id and response.created_at >= now() - interval '30 days')
    ),
    'suspended_users', (select count(*) from auth.users where banned_until > now()),
    'total_groups', (select count(*) from public.groups where deleted_at is null),
    'active_groups_30d', (
      select count(*) from public.groups app_group
      where app_group.deleted_at is null
        and exists (
          select 1 from public.prayer_group_shares share
          where share.group_id = app_group.id and share.created_at >= now() - interval '30 days'
        )
    ),
    'total_prayers', (select count(*) from public.prayer_requests where deleted_at is null),
    'personal_prayers', (
      select count(*) from public.prayer_requests prayer
      where prayer.deleted_at is null
        and not exists (select 1 from public.prayer_group_shares share where share.prayer_id = prayer.id)
    ),
    'group_prayers', (
      select count(*) from public.prayer_requests prayer
      where prayer.deleted_at is null
        and exists (select 1 from public.prayer_group_shares share where share.prayer_id = prayer.id)
    ),
    'prayers_completed_today', (
      select count(*) from public.prayer_responses
      where prayed_on = (now() at time zone 'Asia/Seoul')::date
    ),
    'push_enabled_users', (select count(*) from public.notification_preferences where push_enabled),
    'daily_signups', (
      select coalesce(jsonb_agg(jsonb_build_object('date', day.day, 'count', coalesce(signups.count, 0)) order by day.day), '[]'::jsonb)
      from days day
      left join lateral (
        select count(*) from auth.users account
        where (account.created_at at time zone 'Asia/Seoul')::date = day.day
      ) signups on true
    ),
    'daily_prayers', (
      select coalesce(jsonb_agg(jsonb_build_object('date', day.day, 'count', coalesce(prayers.count, 0)) order by day.day), '[]'::jsonb)
      from days day
      left join lateral (
        select count(*) from public.prayer_requests prayer
        where (prayer.created_at at time zone 'Asia/Seoul')::date = day.day
      ) prayers on true
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.get_admin_users(
  search_term text default null,
  page_size integer default 30,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required';
  end if;

  with filtered as materialized (
    select
      account.id as user_id,
      coalesce(account.email, '') as email,
      coalesce(profile.display_name, split_part(coalesce(account.email, ''), '@', 1), '알 수 없는 회원') as display_name,
      coalesce(profile.profile_color, 'indigo') as profile_color,
      account.created_at,
      account.last_sign_in_at,
      greatest(
        account.last_sign_in_at,
        (select max(prayer.created_at) from public.prayer_requests prayer where prayer.author_id = account.id),
        (select max(response.created_at) from public.prayer_responses response where response.user_id = account.id)
      ) as last_activity_at,
      account.banned_until,
      account.banned_until > now() as is_suspended,
      coalesce(account.raw_app_meta_data -> 'providers', '[]'::jsonb) as providers,
      exists (select 1 from public.super_admins admin where admin.user_id = account.id) as is_super_admin,
      (select count(*) from public.group_memberships membership where membership.user_id = account.id and membership.status = 'active') as group_count,
      (select count(*) from public.prayer_requests prayer where prayer.author_id = account.id and prayer.deleted_at is null) as prayer_count,
      (select count(*) from public.prayer_responses response where response.user_id = account.id) as prayer_response_count
    from auth.users account
    left join public.profiles profile on profile.id = account.id
    where nullif(trim(search_term), '') is null
       or account.email ilike '%' || trim(search_term) || '%'
       or profile.display_name ilike '%' || trim(search_term) || '%'
  ),
  requested_page as (
    select * from filtered
    order by created_at desc, user_id
    limit least(greatest(page_size, 1), 100)
    offset greatest(page_offset, 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'users', coalesce((select jsonb_agg(to_jsonb(member) order by member.created_at desc, member.user_id) from requested_page member), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.get_admin_action_logs(result_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required';
  end if;

  select coalesce(jsonb_agg(to_jsonb(entry) order by entry.created_at desc), '[]'::jsonb)
  into result
  from (
    select log.id, log.target_user_id, log.target_email, log.action, log.metadata, log.created_at,
           coalesce(actor.display_name, '탈퇴한 관리자') as actor_name
    from public.admin_action_logs log
    left join public.profiles actor on actor.id = log.actor_id
    order by log.created_at desc
    limit least(greatest(result_limit, 1), 100)
  ) entry;

  return result;
end;
$$;

create or replace function public.admin_set_user_suspension(target_user_id uuid, should_suspend boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
begin
  if not public.is_super_admin() then raise exception 'super_admin_required'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot_manage_self'; end if;
  if exists (select 1 from public.super_admins where user_id = target_user_id) then raise exception 'cannot_manage_super_admin'; end if;

  select email into target_email from auth.users where id = target_user_id for update;
  if not found then raise exception 'account_not_found'; end if;

  update auth.users
  set banned_until = case when should_suspend then now() + interval '100 years' else null end,
      updated_at = now()
  where id = target_user_id;

  if should_suspend then delete from auth.sessions where user_id = target_user_id; end if;

  insert into public.admin_action_logs(actor_id, target_user_id, target_email, action)
  values (auth.uid(), target_user_id, target_email, case when should_suspend then 'user.suspended' else 'user.unsuspended' end);
end;
$$;

create or replace function public.admin_force_sign_out(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
begin
  if not public.is_super_admin() then raise exception 'super_admin_required'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot_manage_self'; end if;

  select email into target_email from auth.users where id = target_user_id;
  if not found then raise exception 'account_not_found'; end if;

  delete from auth.sessions where user_id = target_user_id;
  insert into public.admin_action_logs(actor_id, target_user_id, target_email, action)
  values (auth.uid(), target_user_id, target_email, 'user.signed_out');
end;
$$;

create or replace function public.admin_delete_user(
  target_user_id uuid,
  confirmation_email text,
  delete_all_prayers boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
  led_group record;
  successor uuid;
begin
  if not public.is_super_admin() then raise exception 'super_admin_required'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot_manage_self'; end if;
  if exists (select 1 from public.super_admins where user_id = target_user_id) then raise exception 'cannot_manage_super_admin'; end if;

  select email into target_email from auth.users where id = target_user_id for update;
  if not found then raise exception 'account_not_found'; end if;
  if lower(trim(confirmation_email)) is distinct from lower(coalesce(target_email, '')) then raise exception 'confirmation_mismatch'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  for led_group in
    select membership.group_id
    from public.group_memberships membership
    join public.groups app_group on app_group.id = membership.group_id
    where membership.user_id = target_user_id and membership.status = 'active' and membership.role = 'leader'
    for update of membership, app_group
  loop
    select membership.user_id into successor
    from public.group_memberships membership
    where membership.group_id = led_group.group_id
      and membership.user_id <> target_user_id
      and membership.status = 'active'
    order by case membership.role when 'admin' then 0 else 1 end, membership.created_at, membership.user_id
    limit 1;

    if successor is null then
      delete from public.groups where id = led_group.group_id;
    else
      update public.group_memberships set role = 'leader', updated_at = now()
      where group_id = led_group.group_id and user_id = successor;
      update public.groups set created_by = successor, updated_at = now()
      where id = led_group.group_id and created_by = target_user_id;
    end if;
  end loop;

  if coalesce(delete_all_prayers, false) then
    delete from public.prayer_requests where author_id = target_user_id;
  else
    delete from public.prayer_requests prayer
    where prayer.author_id = target_user_id
      and not exists (select 1 from public.prayer_group_shares share where share.prayer_id = prayer.id);
  end if;

  insert into public.admin_action_logs(actor_id, target_user_id, target_email, action, metadata)
  values (auth.uid(), target_user_id, target_email, 'user.deleted', jsonb_build_object('deleted_all_prayers', coalesce(delete_all_prayers, false)));

  delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function public.get_admin_insights() from public, anon;
revoke all on function public.get_admin_users(text, integer, integer) from public, anon;
revoke all on function public.get_admin_action_logs(integer) from public, anon;
revoke all on function public.admin_set_user_suspension(uuid, boolean) from public, anon;
revoke all on function public.admin_force_sign_out(uuid) from public, anon;
revoke all on function public.admin_delete_user(uuid, text, boolean) from public, anon;

grant execute on function public.get_admin_insights() to authenticated;
grant execute on function public.get_admin_users(text, integer, integer) to authenticated;
grant execute on function public.get_admin_action_logs(integer) to authenticated;
grant execute on function public.admin_set_user_suspension(uuid, boolean) to authenticated;
grant execute on function public.admin_force_sign_out(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid, text, boolean) to authenticated;

notify pgrst, 'reload schema';
