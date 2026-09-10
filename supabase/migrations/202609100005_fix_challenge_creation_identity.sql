-- Capture the authenticated caller once so nested security-definer calls use
-- the same identity throughout challenge creation.
create or replace function public.create_group_challenge(
  target_group_id uuid,
  challenge_kind public.challenge_kind,
  challenge_title text,
  challenge_invite_mode public.challenge_invite_mode,
  challenge_start_date date,
  challenge_end_date date
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
declare caller_id uuid := auth.uid();
declare creator_name text;
declare creator_color text;
declare today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
begin
  if caller_id is null then raise exception 'authentication_required'; end if;
  if not public.has_group_role(target_group_id, array['leader']::public.group_role[], caller_id) then
    raise exception 'leader_permission_required';
  end if;
  if char_length(trim(challenge_title)) not between 2 and 50 then raise exception 'invalid_title'; end if;
  if challenge_start_date < today_in_korea then raise exception 'invalid_start_date'; end if;
  if challenge_end_date < challenge_start_date + 2 or challenge_end_date > challenge_start_date + 89 then
    raise exception 'invalid_duration';
  end if;

  perform public.sync_prayer_challenges(target_group_id);
  if exists (
    select 1 from public.prayer_challenges
    where group_id = target_group_id and status in ('scheduled', 'active')
  ) then
    raise exception 'active_challenge_exists';
  end if;

  select display_name, coalesce(profile_color, 'indigo')
  into creator_name, creator_color
  from public.profiles where id = caller_id;

  insert into public.prayer_challenges (
    group_id, created_by, kind, title, invite_mode, start_date, end_date, status
  ) values (
    target_group_id, caller_id, challenge_kind, trim(challenge_title), challenge_invite_mode,
    challenge_start_date, challenge_end_date,
    (case when challenge_start_date <= today_in_korea then 'active' else 'scheduled' end)::public.challenge_status
  ) returning id into new_id;

  insert into public.challenge_participants (
    challenge_id, user_id, display_name_snapshot, profile_color_snapshot, invited
  ) values (new_id, caller_id, creator_name, creator_color, false);

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key, data)
  select membership.user_id, caller_id, target_group_id, 'challenge_update',
         'challenge_created:' || new_id::text || ':' || membership.user_id::text,
         jsonb_build_object(
           'challenge_id', new_id,
           'challenge_title', trim(challenge_title),
           'challenge_event', 'created',
           'invited', challenge_invite_mode = 'invite_all'
         )
  from public.group_memberships as membership
  where membership.group_id = target_group_id
    and membership.status = 'active'
    and membership.user_id <> caller_id
  on conflict (event_key) do nothing;

  return new_id;
end;
$$;

revoke all on function public.create_group_challenge(
  uuid, public.challenge_kind, text, public.challenge_invite_mode, date, date
) from public, anon;
grant execute on function public.create_group_challenge(
  uuid, public.challenge_kind, text, public.challenge_invite_mode, date, date
) to authenticated;

notify pgrst, 'reload schema';
