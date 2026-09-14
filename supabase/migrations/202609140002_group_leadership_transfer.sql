-- Leader-only member management. Keep leadership transfer atomic so a group
-- never has two leaders (or no leader) between client requests.

create or replace function public.transfer_group_leadership(
  target_group_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role public.group_role;
  target_role public.group_role;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if target_user_id = current_user_id then raise exception 'cannot_transfer_to_self'; end if;

  select role into current_role
  from public.group_memberships
  where group_id = target_group_id
    and user_id = current_user_id
    and status = 'active'
  for update;

  if current_role is distinct from 'leader'::public.group_role then
    raise exception 'leader_permission_required';
  end if;

  select role into target_role
  from public.group_memberships
  where group_id = target_group_id
    and user_id = target_user_id
    and status = 'active'
  for update;

  if target_role is null then raise exception 'membership_not_found'; end if;
  if target_role = 'leader'::public.group_role then raise exception 'target_is_already_leader'; end if;

  update public.group_memberships
  set role = case
    when user_id = current_user_id then 'admin'::public.group_role
    when user_id = target_user_id then 'leader'::public.group_role
    else role
  end,
  updated_at = now()
  where group_id = target_group_id
    and user_id in (current_user_id, target_user_id)
    and status = 'active';

  update public.groups
  set created_by = target_user_id, updated_at = now()
  where id = target_group_id and deleted_at is null;

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key, data)
  values (
    target_user_id,
    current_user_id,
    target_group_id,
    'role_changed',
    'leadership_transferred:' || target_group_id::text || ':' || target_user_id::text || ':' || extract(epoch from now())::bigint::text,
    jsonb_build_object('role', 'leader')
  );

  insert into public.audit_logs (group_id, actor_id, target_user_id, action, metadata)
  values (
    target_group_id,
    current_user_id,
    target_user_id,
    'membership.leadership_transferred',
    jsonb_build_object('previous_leader_role', 'admin')
  );
end;
$$;

create or replace function public.remove_group_member(
  target_group_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role public.group_role;
  target_role public.group_role;
begin
  if current_user_id is null then raise exception 'authentication_required'; end if;
  if target_user_id = current_user_id then raise exception 'cannot_remove_self'; end if;

  select role into current_role
  from public.group_memberships
  where group_id = target_group_id
    and user_id = current_user_id
    and status = 'active'
  for update;

  if current_role is distinct from 'leader'::public.group_role then
    raise exception 'leader_permission_required';
  end if;

  select role into target_role
  from public.group_memberships
  where group_id = target_group_id
    and user_id = target_user_id
    and status = 'active'
  for update;

  if target_role is null then raise exception 'membership_not_found'; end if;
  if target_role = 'leader'::public.group_role then raise exception 'cannot_remove_leader'; end if;

  insert into public.audit_logs (group_id, actor_id, target_user_id, action)
  values (target_group_id, current_user_id, target_user_id, 'membership.removed');

  delete from public.group_memberships
  where group_id = target_group_id
    and user_id = target_user_id
    and status = 'active';
end;
$$;

revoke all on function public.transfer_group_leadership(uuid, uuid) from public, anon;
revoke all on function public.remove_group_member(uuid, uuid) from public, anon;
grant execute on function public.transfer_group_leadership(uuid, uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
