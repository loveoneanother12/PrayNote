-- Add the user's all-time longest Korea-time daily prayer streak.

create or replace function public.get_my_prayer_rhythm_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with activity_days as (
    select distinct response.prayed_on
    from public.prayer_responses response
    where response.user_id = auth.uid()
  ),
  today as (
    select (now() at time zone 'Asia/Seoul')::date as day
  ),
  anchor as (
    select case
      when exists (select 1 from activity_days where prayed_on = today.day) then today.day
      when exists (select 1 from activity_days where prayed_on = today.day - 1) then today.day - 1
      else null
    end as day
    from today
  ),
  descending_days as (
    select
      activity_days.prayed_on,
      activity_days.prayed_on + row_number() over (order by activity_days.prayed_on desc)::integer as streak_group
    from activity_days, anchor
    where anchor.day is not null and activity_days.prayed_on <= anchor.day
  ),
  all_streak_days as (
    select
      activity_days.prayed_on,
      activity_days.prayed_on - row_number() over (order by activity_days.prayed_on)::integer as streak_group
    from activity_days
  ),
  all_streaks as (
    select count(*)::integer as streak_length
    from all_streak_days
    group by streak_group
  )
  select jsonb_build_object(
    'current_streak', coalesce((
      select count(*)::integer
      from descending_days, anchor
      where descending_days.streak_group = anchor.day + 1
    ), 0),
    'longest_streak', coalesce((select max(streak_length) from all_streaks), 0),
    'prayed_today', exists (
      select 1 from activity_days, today where activity_days.prayed_on = today.day
    )
  );
$$;

revoke all on function public.get_my_prayer_rhythm_fast() from public, anon;
grant execute on function public.get_my_prayer_rhythm_fast() to authenticated;

notify pgrst, 'reload schema';
