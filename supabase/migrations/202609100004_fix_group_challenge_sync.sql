-- Avoid PL/pgSQL record/SQL alias collisions while refreshing challenge state.
create or replace function public.sync_prayer_challenges(target_group_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare expired_challenge record;
declare today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
begin
  update public.prayer_challenges
  set status = 'active'
  where status = 'scheduled'
    and start_date <= today_in_korea
    and (target_group_id is null or group_id = target_group_id);

  insert into public.notifications (recipient_id, group_id, type, event_key, data)
  select membership.user_id, active_challenge.group_id, 'challenge_update',
         'challenge_started:' || active_challenge.id::text || ':' || membership.user_id::text,
         jsonb_build_object(
           'challenge_id', active_challenge.id,
           'challenge_title', active_challenge.title,
           'challenge_event', 'started'
         )
  from public.prayer_challenges as active_challenge
  join public.group_memberships as membership
    on membership.group_id = active_challenge.group_id
   and membership.status = 'active'
  where active_challenge.status = 'active'
    and active_challenge.start_date = today_in_korea
    and (target_group_id is null or active_challenge.group_id = target_group_id)
  on conflict (event_key) do nothing;

  for expired_challenge in
    select prayer_challenge.id
    from public.prayer_challenges as prayer_challenge
    where prayer_challenge.status in ('scheduled', 'active')
      and prayer_challenge.end_date < today_in_korea
      and (target_group_id is null or prayer_challenge.group_id = target_group_id)
  loop
    perform public.finalize_prayer_challenge(expired_challenge.id, false);
  end loop;
end;
$$;

revoke all on function public.sync_prayer_challenges(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
