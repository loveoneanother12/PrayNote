-- A membership request notifies every leader and admin. The previous event key
-- was identical for every recipient, so groups with multiple approvers hit the
-- notifications.event_key unique constraint and rolled back the whole request.
create or replace function public.request_group_membership(target_group_id uuid, submitted_code text)
returns public.membership_status
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_code text;
  current_status public.membership_status;
  request_event_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select app_group.invite_code into expected_code
  from public.groups app_group
  where app_group.id = target_group_id and app_group.deleted_at is null;

  if expected_code is null then raise exception 'group_not_found'; end if;
  if upper(trim(submitted_code)) <> expected_code then raise exception 'invalid_invite_code'; end if;

  select membership.status into current_status
  from public.group_memberships membership
  where membership.group_id = target_group_id and membership.user_id = auth.uid();

  if current_status = 'active' then return current_status; end if;
  if current_status = 'pending' then return current_status; end if;

  insert into public.group_memberships (group_id, user_id, role, status, requested_at, reviewed_by, reviewed_at)
  values (target_group_id, auth.uid(), 'member', 'pending', now(), null, null)
  on conflict (group_id, user_id) do update
    set status = 'pending', requested_at = now(), reviewed_by = null, reviewed_at = null, updated_at = now();

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key)
  select
    membership.user_id,
    auth.uid(),
    target_group_id,
    'membership_requested',
    'membership_requested:' || target_group_id::text || ':' || auth.uid()::text || ':' || membership.user_id::text || ':' || request_event_id::text
  from public.group_memberships membership
  where membership.group_id = target_group_id
    and membership.status = 'active'
    and membership.role in ('admin', 'leader');

  return 'pending';
end;
$$;

revoke all on function public.request_group_membership(uuid, text) from public, anon;
grant execute on function public.request_group_membership(uuid, text) to authenticated;

notify pgrst, 'reload schema';
