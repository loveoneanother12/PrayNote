-- Keep one prayer response per person, prayer, and Korea-local calendar day.
-- This preserves history for future streak and timeline visualizations.
alter table public.prayer_responses
  add column if not exists prayed_on date;

update public.prayer_responses
set prayed_on = (created_at at time zone 'Asia/Seoul')::date
where prayed_on is null;

alter table public.prayer_responses
  alter column prayed_on set default ((now() at time zone 'Asia/Seoul')::date),
  alter column prayed_on set not null;

alter table public.prayer_responses
  drop constraint if exists prayer_responses_prayer_id_user_id_key;

alter table public.prayer_responses
  drop constraint if exists prayer_responses_prayer_id_user_id_prayed_on_key;

alter table public.prayer_responses
  add constraint prayer_responses_prayer_id_user_id_prayed_on_key
  unique (prayer_id, user_id, prayed_on);

create index if not exists prayer_responses_user_date_idx
  on public.prayer_responses(user_id, prayed_on desc);

create or replace function public.toggle_prayer_response(target_prayer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_prayer public.prayer_requests%rowtype;
  today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
  removed_count integer;
begin
  select * into target_prayer
  from public.prayer_requests
  where id = target_prayer_id and deleted_at is null and hidden_at is null;

  if target_prayer.id is null then raise exception 'prayer_not_found'; end if;
  if not public.is_active_group_member(target_prayer.group_id) then raise exception 'permission_denied'; end if;

  delete from public.prayer_responses
  where prayer_id = target_prayer_id
    and user_id = auth.uid()
    and prayed_on = today_in_korea;
  get diagnostics removed_count = row_count;

  if removed_count > 0 then return false; end if;

  insert into public.prayer_responses (prayer_id, user_id, prayed_on)
  values (target_prayer_id, auth.uid(), today_in_korea);

  if target_prayer.author_id <> auth.uid() then
    insert into public.notifications (recipient_id, actor_id, group_id, prayer_id, type, event_key)
    values (
      target_prayer.author_id,
      auth.uid(),
      target_prayer.group_id,
      target_prayer.id,
      'prayer_response',
      'prayer_response:' || target_prayer.id::text || ':' || auth.uid()::text || ':' || today_in_korea::text
    ) on conflict (event_key) do nothing;
  end if;

  return true;
end;
$$;

grant execute on function public.toggle_prayer_response(uuid) to authenticated;
