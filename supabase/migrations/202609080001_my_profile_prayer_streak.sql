-- Enrich the My page bundle with a Korea-time daily prayer streak.

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
  ranked_days as (
    select
      activity_days.prayed_on,
      activity_days.prayed_on + row_number() over (order by activity_days.prayed_on desc)::integer as streak_group
    from activity_days, anchor
    where anchor.day is not null and activity_days.prayed_on <= anchor.day
  )
  select jsonb_build_object(
    'current_streak', coalesce((
      select count(*)::integer
      from ranked_days, anchor
      where ranked_days.streak_group = anchor.day + 1
    ), 0),
    'prayed_today', exists (
      select 1 from activity_days, today where activity_days.prayed_on = today.day
    )
  );
$$;

create or replace function public.get_my_prayers_bundle_fast()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'my_groups', public.get_my_group_options_fast(),
    'prayer_rhythm', public.get_my_prayer_rhythm_fast(),
    'prayers', coalesce((
      select jsonb_agg(to_jsonb(prayer) || jsonb_build_object('author_color', coalesce(author.profile_color, 'indigo')) order by prayer.created_at desc)
      from public.get_prayer_summaries_fast(target_author_id => auth.uid(), result_limit => 200) prayer
      left join public.profiles author on author.id = prayer.author_id
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.get_my_prayer_rhythm_fast() from public, anon;
revoke all on function public.get_my_prayers_bundle_fast() from public;
grant execute on function public.get_my_prayer_rhythm_fast() to authenticated;
grant execute on function public.get_my_prayers_bundle_fast() to anon, authenticated;

notify pgrst, 'reload schema';
