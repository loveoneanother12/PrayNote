-- Apply each user's notification preferences to every in-app notification.

create or replace function public.respect_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferences public.notification_preferences%rowtype;
begin
  select * into preferences
  from public.notification_preferences
  where user_id = new.recipient_id;

  if not coalesce(preferences.in_app_enabled, true) then
    return null;
  end if;

  if new.type = 'new_prayer' and not coalesce(preferences.new_prayer_enabled, true) then
    return null;
  end if;

  if new.type = 'prayer_response' and not coalesce(preferences.prayer_response_enabled, true) then
    return null;
  end if;

  if new.type in (
    'membership_requested',
    'membership_approved',
    'membership_rejected',
    'role_changed',
    'group_updated'
  ) and not coalesce(preferences.membership_enabled, true) then
    return null;
  end if;

  return new;
end;
$$;

create trigger notifications_respect_preferences
before insert on public.notifications
for each row execute function public.respect_notification_preferences();

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

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key)
  select
    gm.user_id,
    auth.uid(),
    target_group_id,
    'group_updated',
    'group_updated:' || target_group_id::text || ':' || gm.user_id::text || ':' || extract(epoch from now())::bigint::text
  from public.group_memberships gm
  where gm.group_id = target_group_id
    and gm.status = 'active'
    and gm.user_id <> auth.uid();

  insert into public.audit_logs (group_id, actor_id, action)
  values (target_group_id, auth.uid(), 'group.updated');
end;
$$;

revoke all on function public.respect_notification_preferences() from public, anon, authenticated;
