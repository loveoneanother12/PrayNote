-- Group prayer challenges: shared goals without rankings or prayer content.

do $$ begin
  create type public.challenge_kind as enum ('prayer_relay', 'first_prayer', 'unbroken_prayer');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.challenge_status as enum ('scheduled', 'active', 'completed', 'stopped');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.challenge_invite_mode as enum ('open', 'invite_all');
exception when duplicate_object then null;
end $$;

alter type public.notification_type add value if not exists 'challenge_update';
alter table public.notification_preferences
  add column if not exists challenge_enabled boolean not null default true;

create table public.prayer_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  kind public.challenge_kind not null,
  title text not null check (char_length(trim(title)) between 2 and 50),
  invite_mode public.challenge_invite_mode not null default 'open',
  start_date date not null,
  end_date date not null,
  status public.challenge_status not null default 'scheduled',
  completed_successfully boolean,
  result jsonb,
  finalized_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_challenges_date_check check (
    end_date >= start_date + 2 and end_date <= start_date + 89
  )
);

create unique index prayer_challenges_one_open_per_group_idx
  on public.prayer_challenges(group_id) where status in ('scheduled', 'active');
create index prayer_challenges_group_created_idx
  on public.prayer_challenges(group_id, created_at desc);

create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.prayer_challenges(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name_snapshot text not null,
  profile_color_snapshot text not null default 'indigo',
  invited boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (challenge_id, user_id)
);

create index challenge_participants_challenge_active_idx
  on public.challenge_participants(challenge_id, left_at, joined_at);

create table public.challenge_daily_activity (
  participant_id uuid not null references public.challenge_participants(id) on delete cascade,
  challenge_id uuid not null references public.prayer_challenges(id) on delete cascade,
  activity_date date not null,
  first_recorded_at timestamptz not null default now(),
  primary key (participant_id, activity_date)
);

create index challenge_daily_activity_challenge_date_idx
  on public.challenge_daily_activity(challenge_id, activity_date);

drop trigger if exists prayer_challenges_set_updated_at on public.prayer_challenges;
create trigger prayer_challenges_set_updated_at before update on public.prayer_challenges
for each row execute function public.set_updated_at();

alter table public.prayer_challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_daily_activity enable row level security;

create policy prayer_challenges_select_group_member on public.prayer_challenges
for select to authenticated using (public.is_active_group_member(group_id));
create policy challenge_participants_select_group_member on public.challenge_participants
for select to authenticated using (
  exists (select 1 from public.prayer_challenges challenge
    where challenge.id = challenge_participants.challenge_id
      and public.is_active_group_member(challenge.group_id))
);
create policy challenge_activity_select_group_member on public.challenge_daily_activity
for select to authenticated using (
  exists (select 1 from public.prayer_challenges challenge
    where challenge.id = challenge_daily_activity.challenge_id
      and public.is_active_group_member(challenge.group_id))
);

revoke all on table public.prayer_challenges, public.challenge_participants, public.challenge_daily_activity from anon, authenticated;
grant select on table public.prayer_challenges, public.challenge_participants, public.challenge_daily_activity to authenticated;

create or replace function public.challenge_longest_streak(target_challenge_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  with distinct_days as (
    select distinct activity.activity_date
    from public.challenge_daily_activity activity
    where activity.challenge_id = target_challenge_id
  ), grouped_days as (
    select activity_date,
           activity_date - (row_number() over (order by activity_date))::integer as island
    from distinct_days
  ), streaks as (
    select count(*)::integer as length from grouped_days group by island
  )
  select coalesce(max(length), 0) from streaks;
$$;

create or replace function public.finalize_prayer_challenge(target_challenge_id uuid, force_stop boolean default false)
returns public.prayer_challenges language plpgsql security definer set search_path = public as $$
declare
  challenge public.prayer_challenges%rowtype;
  total_days integer;
  active_day_count integer;
  participant_count integer;
  all_participated boolean;
  successful boolean;
  longest_streak integer;
begin
  select * into challenge from public.prayer_challenges where id = target_challenge_id for update;
  if challenge.id is null then raise exception 'challenge_not_found'; end if;
  if challenge.status in ('completed', 'stopped') then return challenge; end if;
  if force_stop then
    if not public.has_group_role(challenge.group_id, array['leader']::public.group_role[]) then
      raise exception 'leader_permission_required';
    end if;
  elsif challenge.end_date >= (now() at time zone 'Asia/Seoul')::date then
    return challenge;
  end if;

  total_days := challenge.end_date - challenge.start_date + 1;
  select count(distinct activity_date)::integer into active_day_count
  from public.challenge_daily_activity where challenge_id = challenge.id
    and activity_date between challenge.start_date and challenge.end_date;
  select count(*)::integer into participant_count
  from public.challenge_participants participant
  where participant.challenge_id = challenge.id and participant.left_at is null;
  select participant_count > 0 and not exists (
    select 1 from public.challenge_participants participant
    where participant.challenge_id = challenge.id and participant.left_at is null
      and not exists (select 1 from public.challenge_daily_activity activity
        where activity.participant_id = participant.id
          and activity.activity_date between challenge.start_date and challenge.end_date)
  ) into all_participated;
  longest_streak := public.challenge_longest_streak(challenge.id);
  successful := case challenge.kind
    when 'prayer_relay' then active_day_count = total_days and all_participated
    when 'first_prayer' then all_participated
    when 'unbroken_prayer' then active_day_count = total_days
  end;

  update public.prayer_challenges
  set status = case when force_stop then 'stopped' else 'completed' end,
      completed_successfully = case when force_stop then false else successful end,
      stopped_at = case when force_stop then now() else null end,
      finalized_at = now(),
      result = jsonb_build_object(
        'activeDayCount', active_day_count, 'participantCount', participant_count,
        'allParticipated', all_participated, 'longestStreak', longest_streak,
        'totalDays', total_days)
  where id = challenge.id returning * into challenge;

  insert into public.notifications (recipient_id, group_id, type, event_key, data)
  select membership.user_id, challenge.group_id, 'challenge_update',
         'challenge_result:' || challenge.id::text || ':' || membership.user_id::text,
         jsonb_build_object(
           'challenge_id', challenge.id, 'challenge_title', challenge.title,
           'challenge_event', case when force_stop then 'stopped' when successful then 'completed' else 'ended' end)
  from public.group_memberships membership
  where membership.group_id = challenge.group_id and membership.status = 'active'
  on conflict (event_key) do nothing;
  return challenge;
end;
$$;

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
declare creator_name text;
declare creator_color text;
declare today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not public.has_group_role(target_group_id, array['leader']::public.group_role[]) then
    raise exception 'leader_permission_required';
  end if;
  if char_length(trim(challenge_title)) not between 2 and 50 then raise exception 'invalid_title'; end if;
  if challenge_start_date < today_in_korea then raise exception 'invalid_start_date'; end if;
  if challenge_end_date < challenge_start_date + 2 or challenge_end_date > challenge_start_date + 89 then
    raise exception 'invalid_duration';
  end if;
  perform public.sync_prayer_challenges(target_group_id);
  if exists (select 1 from public.prayer_challenges
    where group_id = target_group_id and status in ('scheduled', 'active')) then
    raise exception 'active_challenge_exists';
  end if;

  select display_name, coalesce(profile_color, 'indigo') into creator_name, creator_color
  from public.profiles where id = auth.uid();
  insert into public.prayer_challenges (
    group_id, created_by, kind, title, invite_mode, start_date, end_date, status
  ) values (
    target_group_id, auth.uid(), challenge_kind, trim(challenge_title), challenge_invite_mode,
    challenge_start_date, challenge_end_date,
    case when challenge_start_date <= today_in_korea then 'active' else 'scheduled' end
  ) returning id into new_id;
  insert into public.challenge_participants (
    challenge_id, user_id, display_name_snapshot, profile_color_snapshot, invited
  ) values (new_id, auth.uid(), creator_name, creator_color, false);

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key, data)
  select membership.user_id, auth.uid(), target_group_id, 'challenge_update',
         'challenge_created:' || new_id::text || ':' || membership.user_id::text,
         jsonb_build_object(
           'challenge_id', new_id, 'challenge_title', trim(challenge_title),
           'challenge_event', 'created', 'invited', challenge_invite_mode = 'invite_all')
  from public.group_memberships membership
  where membership.group_id = target_group_id and membership.status = 'active'
    and membership.user_id <> auth.uid()
  on conflict (event_key) do nothing;
  return new_id;
end;
$$;

create or replace function public.toggle_challenge_participation(target_challenge_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare challenge public.prayer_challenges%rowtype;
declare participant public.challenge_participants%rowtype;
declare profile_name text;
declare profile_color text;
begin
  select * into challenge from public.prayer_challenges where id = target_challenge_id;
  if challenge.id is null or challenge.status not in ('scheduled', 'active') then raise exception 'challenge_not_joinable'; end if;
  if not public.is_active_group_member(challenge.group_id) then raise exception 'permission_denied'; end if;
  select * into participant from public.challenge_participants
  where challenge_id = challenge.id and user_id = auth.uid() for update;
  if participant.id is not null and participant.left_at is null then
    update public.challenge_participants set left_at = now() where id = participant.id;
    return false;
  end if;
  if participant.id is not null then
    update public.challenge_participants set left_at = null, joined_at = now() where id = participant.id;
  else
    select display_name, coalesce(profile_color, 'indigo') into profile_name, profile_color
    from public.profiles where id = auth.uid();
    insert into public.challenge_participants (
      challenge_id, user_id, display_name_snapshot, profile_color_snapshot, invited
    ) values (
      challenge.id, auth.uid(), profile_name, profile_color, challenge.invite_mode = 'invite_all'
    );
  end if;
  return true;
end;
$$;

create or replace function public.extend_group_challenge(target_challenge_id uuid, new_end_date date)
returns void language plpgsql security definer set search_path = public as $$
declare challenge public.prayer_challenges%rowtype;
begin
  select * into challenge from public.prayer_challenges where id = target_challenge_id for update;
  if challenge.id is null then raise exception 'challenge_not_found'; end if;
  if not public.has_group_role(challenge.group_id, array['leader']::public.group_role[]) then raise exception 'leader_permission_required'; end if;
  if challenge.status not in ('scheduled', 'active') then raise exception 'challenge_not_extendable'; end if;
  if new_end_date <= challenge.end_date or new_end_date > challenge.start_date + 89 then raise exception 'invalid_end_date'; end if;
  update public.prayer_challenges set end_date = new_end_date where id = challenge.id;
end;
$$;

create or replace function public.stop_group_challenge(target_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare challenge public.prayer_challenges%rowtype;
begin
  select * into challenge from public.prayer_challenges where id = target_challenge_id;
  if challenge.id is null then raise exception 'challenge_not_found'; end if;
  if not public.has_group_role(challenge.group_id, array['leader']::public.group_role[]) then
    raise exception 'leader_permission_required';
  end if;
  perform public.finalize_prayer_challenge(target_challenge_id, true);
end;
$$;

create or replace function public.record_challenge_activity_from_response()
returns trigger language plpgsql security definer set search_path = public as $$
declare response_row public.prayer_responses%rowtype;
declare candidate record;
begin
  response_row := case when tg_op = 'DELETE' then old else new end;
  for candidate in
    select distinct challenge.id as challenge_id, challenge.group_id, participant.id as participant_id
    from public.prayer_group_shares share
    join public.prayer_challenges challenge on challenge.group_id = share.group_id
    join public.challenge_participants participant
      on participant.challenge_id = challenge.id and participant.user_id = response_row.user_id
      and participant.left_at is null
    where share.prayer_id = response_row.prayer_id
      and challenge.status in ('scheduled', 'active')
      and response_row.prayed_on between challenge.start_date and challenge.end_date
  loop
    if tg_op = 'INSERT' then
      insert into public.challenge_daily_activity (participant_id, challenge_id, activity_date)
      values (candidate.participant_id, candidate.challenge_id, response_row.prayed_on)
      on conflict (participant_id, activity_date) do nothing;
    elsif not exists (
      select 1 from public.prayer_responses response
      join public.prayer_group_shares other_share on other_share.prayer_id = response.prayer_id
      where response.user_id = response_row.user_id and response.prayed_on = response_row.prayed_on
        and other_share.group_id = candidate.group_id
    ) then
      delete from public.challenge_daily_activity
      where participant_id = candidate.participant_id and activity_date = response_row.prayed_on;
    end if;
  end loop;
  return coalesce(new, old);
end;
$$;

drop trigger if exists prayer_responses_record_challenge_activity on public.prayer_responses;
create trigger prayer_responses_record_challenge_activity
after insert or delete on public.prayer_responses
for each row execute function public.record_challenge_activity_from_response();

create or replace function public.leave_challenge_when_membership_ends()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or (old.status = 'active' and new.status <> 'active') then
    update public.challenge_participants participant
    set left_at = coalesce(participant.left_at, now())
    from public.prayer_challenges challenge
    where participant.challenge_id = challenge.id and challenge.group_id = old.group_id
      and participant.user_id = old.user_id and participant.left_at is null;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists memberships_leave_challenge on public.group_memberships;
create trigger memberships_leave_challenge
after update or delete on public.group_memberships
for each row execute function public.leave_challenge_when_membership_ends();

create or replace function public.anonymize_departed_challenge_participant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.user_id is not null and new.user_id is null then
    new.left_at := coalesce(new.left_at, now());
    new.display_name_snapshot := '탈퇴한 사용자';
    new.profile_color_snapshot := 'slate';
  end if;
  return new;
end;
$$;

drop trigger if exists challenge_participants_anonymize_departed on public.challenge_participants;
create trigger challenge_participants_anonymize_departed
before update on public.challenge_participants
for each row execute function public.anonymize_departed_challenge_participant();

create or replace function public.challenge_to_json(challenge public.prayer_challenges)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(challenge) || jsonb_build_object(
    'joined', exists (select 1 from public.challenge_participants participant
      where participant.challenge_id = challenge.id and participant.user_id = auth.uid() and participant.left_at is null),
    'active_days', coalesce((select jsonb_agg(day.activity_date order by day.activity_date)
      from (select distinct activity.activity_date from public.challenge_daily_activity activity
        where activity.challenge_id = challenge.id) day), '[]'::jsonb),
    'participants', coalesce((select jsonb_agg(jsonb_build_object(
        'id', participant.id, 'user_id', participant.user_id,
        'display_name', case when participant.user_id is null then '탈퇴한 사용자' else participant.display_name_snapshot end,
        'profile_color', participant.profile_color_snapshot, 'joined_at', participant.joined_at,
        'left_at', participant.left_at,
        'has_participated', exists (select 1 from public.challenge_daily_activity activity where activity.participant_id = participant.id)
      ) order by participant.joined_at)
      from public.challenge_participants participant where participant.challenge_id = challenge.id), '[]'::jsonb),
    'recent_activity', coalesce((select jsonb_agg(to_jsonb(activity_item)
        order by activity_item.activity_date desc, activity_item.first_recorded_at desc)
      from (select activity.activity_date, activity.first_recorded_at,
          case when participant.user_id is null then '탈퇴한 사용자' else participant.display_name_snapshot end as display_name
        from public.challenge_daily_activity activity
        join public.challenge_participants participant on participant.id = activity.participant_id
        where activity.challenge_id = challenge.id
        order by activity.activity_date desc, activity.first_recorded_at desc limit 8) activity_item), '[]'::jsonb)
  );
$$;

create or replace function public.get_group_challenges_bundle(target_group_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare output jsonb;
begin
  if not public.is_active_group_member(target_group_id) then return null; end if;
  perform public.sync_prayer_challenges(target_group_id);
  select jsonb_build_object(
    'active', (select public.challenge_to_json(challenge)
      from public.prayer_challenges challenge
      where challenge.group_id = target_group_id and challenge.status in ('scheduled', 'active')
      order by challenge.created_at desc limit 1),
    'history', coalesce((select jsonb_agg(public.challenge_to_json(challenge)
      order by challenge.finalized_at desc nulls last, challenge.created_at desc)
      from public.prayer_challenges challenge
      where challenge.group_id = target_group_id and challenge.status in ('completed', 'stopped')), '[]'::jsonb)
  ) into output;
  return output;
end;
$$;

create or replace function public.sync_prayer_challenges(target_group_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare challenge record;
declare today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
begin
  update public.prayer_challenges set status = 'active'
  where status = 'scheduled' and start_date <= today_in_korea
    and (target_group_id is null or group_id = target_group_id);

  insert into public.notifications (recipient_id, group_id, type, event_key, data)
  select membership.user_id, challenge.group_id, 'challenge_update',
         'challenge_started:' || challenge.id::text || ':' || membership.user_id::text,
         jsonb_build_object('challenge_id', challenge.id, 'challenge_title', challenge.title, 'challenge_event', 'started')
  from public.prayer_challenges challenge
  join public.group_memberships membership on membership.group_id = challenge.group_id and membership.status = 'active'
  where challenge.status = 'active' and challenge.start_date = today_in_korea
    and (target_group_id is null or challenge.group_id = target_group_id)
  on conflict (event_key) do nothing;

  for challenge in select id from public.prayer_challenges
    where status in ('scheduled', 'active') and end_date < today_in_korea
      and (target_group_id is null or group_id = target_group_id)
  loop
    perform public.finalize_prayer_challenge(challenge.id, false);
  end loop;
end;
$$;

create or replace function public.process_prayer_challenge_events()
returns void language plpgsql security definer set search_path = public as $$
declare today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
begin
  perform public.sync_prayer_challenges(null);
  insert into public.notifications (recipient_id, group_id, type, event_key, data)
  select membership.user_id, challenge.group_id, 'challenge_update',
         'challenge_last_day:' || challenge.id::text || ':' || membership.user_id::text,
         jsonb_build_object('challenge_id', challenge.id, 'challenge_title', challenge.title, 'challenge_event', 'last_day')
  from public.prayer_challenges challenge
  join public.group_memberships membership on membership.group_id = challenge.group_id and membership.status = 'active'
  where challenge.status = 'active' and challenge.end_date = today_in_korea + 1
  on conflict (event_key) do nothing;
end;
$$;

create or replace function public.send_prayer_challenge_daily_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
begin
  insert into public.notifications (recipient_id, group_id, type, event_key, data)
  select participant.user_id, challenge.group_id, 'challenge_update',
         'challenge_daily_reminder:' || challenge.id::text || ':' || today_in_korea::text || ':' || participant.user_id::text,
         jsonb_build_object('challenge_id', challenge.id, 'challenge_title', challenge.title, 'challenge_event', 'daily_reminder')
  from public.prayer_challenges challenge
  join public.challenge_participants participant on participant.challenge_id = challenge.id and participant.left_at is null
  where challenge.status = 'active' and participant.user_id is not null
    and today_in_korea between challenge.start_date and challenge.end_date
    and not exists (select 1 from public.challenge_daily_activity activity
      where activity.challenge_id = challenge.id and activity.activity_date = today_in_korea)
  on conflict (event_key) do nothing;
end;
$$;

create or replace function public.respect_notification_preferences()
returns trigger language plpgsql security definer set search_path = public as $$
declare preferences public.notification_preferences%rowtype;
begin
  select * into preferences from public.notification_preferences where user_id = new.recipient_id;
  if not coalesce(preferences.in_app_enabled, true) then return null; end if;
  if new.type = 'new_prayer' and not coalesce(preferences.new_prayer_enabled, true) then return null; end if;
  if new.type = 'prayer_response' and not coalesce(preferences.prayer_response_enabled, true) then return null; end if;
  if new.type = 'notice_published' and not coalesce(preferences.notice_enabled, true) then return null; end if;
  if new.type = 'challenge_update' and not coalesce(preferences.challenge_enabled, true) then return null; end if;
  if new.type in ('membership_requested', 'membership_approved', 'membership_rejected', 'role_changed', 'group_updated')
     and not coalesce(preferences.membership_enabled, true) then return null; end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'praynote-challenge-events') then
    perform cron.schedule('praynote-challenge-events', '5 15 * * *', 'select public.process_prayer_challenge_events()');
  end if;
  if not exists (select 1 from cron.job where jobname = 'praynote-challenge-daily-reminder') then
    perform cron.schedule('praynote-challenge-daily-reminder', '0 11 * * *', 'select public.send_prayer_challenge_daily_reminders()');
  end if;
end;
$$;

revoke all on function public.challenge_longest_streak(uuid) from public, anon, authenticated;
revoke all on function public.sync_prayer_challenges(uuid) from public, anon, authenticated;
revoke all on function public.record_challenge_activity_from_response() from public, anon, authenticated;
revoke all on function public.leave_challenge_when_membership_ends() from public, anon, authenticated;
revoke all on function public.anonymize_departed_challenge_participant() from public, anon, authenticated;
revoke all on function public.challenge_to_json(public.prayer_challenges) from public, anon, authenticated;
revoke all on function public.process_prayer_challenge_events() from public, anon, authenticated;
revoke all on function public.send_prayer_challenge_daily_reminders() from public, anon, authenticated;
revoke all on function public.create_group_challenge(uuid, public.challenge_kind, text, public.challenge_invite_mode, date, date) from public, anon;
revoke all on function public.toggle_challenge_participation(uuid) from public, anon;
revoke all on function public.extend_group_challenge(uuid, date) from public, anon;
revoke all on function public.finalize_prayer_challenge(uuid, boolean) from public, anon;
revoke all on function public.stop_group_challenge(uuid) from public, anon;
revoke all on function public.get_group_challenges_bundle(uuid) from public, anon;
grant execute on function public.create_group_challenge(uuid, public.challenge_kind, text, public.challenge_invite_mode, date, date) to authenticated;
grant execute on function public.toggle_challenge_participation(uuid) to authenticated;
grant execute on function public.extend_group_challenge(uuid, date) to authenticated;
grant execute on function public.stop_group_challenge(uuid) to authenticated;
grant execute on function public.get_group_challenges_bundle(uuid) to authenticated;

notify pgrst, 'reload schema';
