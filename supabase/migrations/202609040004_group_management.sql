-- Group lifecycle and role-management functions.

create policy profiles_select_pending_applicant on public.profiles
for select to authenticated
using (
  exists (
    select 1
    from public.group_memberships applicant
    where applicant.user_id = profiles.id
      and applicant.status = 'pending'
      and public.has_group_role(applicant.group_id, array['admin', 'leader']::public.group_role[])
  )
);

create or replace function public.request_group_membership_by_code(submitted_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select id into target_group_id
  from public.groups
  where invite_code = upper(trim(submitted_code))
    and deleted_at is null;

  if target_group_id is null then raise exception 'invalid_invite_code'; end if;

  perform public.request_group_membership(target_group_id, submitted_code);
  return target_group_id;
end;
$$;

create or replace function public.update_group_details(
  target_group_id uuid,
  group_name text,
  group_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_group_role(target_group_id, array['leader']::public.group_role[]) then
    raise exception 'permission_denied';
  end if;
  if char_length(trim(group_name)) not between 2 and 50 then raise exception 'invalid_group_name'; end if;
  if group_description is not null and char_length(group_description) > 500 then raise exception 'invalid_group_description'; end if;

  update public.groups
  set name = trim(group_name), description = nullif(trim(group_description), ''), updated_at = now()
  where id = target_group_id and deleted_at is null;

  insert into public.audit_logs (group_id, actor_id, action)
  values (target_group_id, auth.uid(), 'group.updated');
end;
$$;

create or replace function public.set_group_admin(
  target_group_id uuid,
  target_user_id uuid,
  make_admin boolean
)
returns public.group_role
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.group_role;
  new_role public.group_role;
begin
  if not public.has_group_role(target_group_id, array['leader']::public.group_role[]) then
    raise exception 'permission_denied';
  end if;
  if target_user_id = auth.uid() then raise exception 'cannot_change_own_leader_role'; end if;

  select role into current_role
  from public.group_memberships
  where group_id = target_group_id and user_id = target_user_id and status = 'active';

  if current_role is null then raise exception 'membership_not_found'; end if;
  if current_role = 'leader' then raise exception 'cannot_change_leader_role'; end if;

  new_role := case when make_admin then 'admin'::public.group_role else 'member'::public.group_role end;

  update public.group_memberships
  set role = new_role, updated_at = now()
  where group_id = target_group_id and user_id = target_user_id;

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key, data)
  values (
    target_user_id,
    auth.uid(),
    target_group_id,
    'role_changed',
    'role_changed:' || target_group_id::text || ':' || target_user_id::text || ':' || extract(epoch from now())::bigint::text,
    jsonb_build_object('role', new_role::text)
  );

  insert into public.audit_logs (group_id, actor_id, target_user_id, action, metadata)
  values (target_group_id, auth.uid(), target_user_id, 'membership.role_changed', jsonb_build_object('role', new_role::text));

  return new_role;
end;
$$;

create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.group_role;
begin
  select role into current_role
  from public.group_memberships
  where group_id = target_group_id and user_id = auth.uid() and status = 'active';

  if current_role is null then raise exception 'membership_not_found'; end if;
  if current_role = 'leader' then raise exception 'leader_must_delete_group'; end if;

  insert into public.audit_logs (group_id, actor_id, target_user_id, action)
  values (target_group_id, auth.uid(), auth.uid(), 'membership.left');

  delete from public.group_memberships
  where group_id = target_group_id and user_id = auth.uid();
end;
$$;

create or replace function public.delete_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_group_role(target_group_id, array['leader']::public.group_role[]) then
    raise exception 'permission_denied';
  end if;

  insert into public.audit_logs (group_id, actor_id, action)
  values (target_group_id, auth.uid(), 'group.deleted');

  update public.groups
  set deleted_at = now(), updated_at = now()
  where id = target_group_id and deleted_at is null;
end;
$$;

grant execute on function public.request_group_membership_by_code(text) to authenticated;
grant execute on function public.update_group_details(uuid, text, text) to authenticated;
grant execute on function public.set_group_admin(uuid, uuid, boolean) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
