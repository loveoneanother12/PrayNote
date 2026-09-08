alter table public.notification_preferences
  add column if not exists notice_enabled boolean not null default true;

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

  if not coalesce(preferences.in_app_enabled, true) then return null; end if;
  if new.type = 'new_prayer' and not coalesce(preferences.new_prayer_enabled, true) then return null; end if;
  if new.type = 'prayer_response' and not coalesce(preferences.prayer_response_enabled, true) then return null; end if;
  if new.type = 'notice_published' and not coalesce(preferences.notice_enabled, true) then return null; end if;
  if new.type in ('membership_requested', 'membership_approved', 'membership_rejected', 'role_changed', 'group_updated')
     and not coalesce(preferences.membership_enabled, true) then return null; end if;
  return new;
end;
$$;

create or replace function public.notify_notice_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.is_published then return new; end if;
  insert into public.notifications (recipient_id, actor_id, type, event_key, data)
  select profile.id, new.created_by, 'notice_published',
         'notice_published:' || new.id::text || ':' || profile.id::text,
         jsonb_build_object('notice_id', new.id, 'title', new.title)
  from public.profiles profile
  on conflict (event_key) do nothing;
  return new;
end;
$$;

drop trigger if exists notices_notify_published on public.notices;
create trigger notices_notify_published
after insert on public.notices
for each row execute function public.notify_notice_published();

create or replace function public.restore_prayers_from_trash(target_prayer_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.prayer_requests
  set deleted_at = null, updated_at = now()
  where id = any(coalesce(target_prayer_ids, array[]::uuid[]))
    and author_id = auth.uid()
    and deleted_at is not null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.permanently_delete_prayers(target_prayer_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  delete from public.prayer_requests
  where id = any(coalesce(target_prayer_ids, array[]::uuid[]))
    and author_id = auth.uid()
    and deleted_at is not null;
  get diagnostics affected = row_count;
  return affected;
end;
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
    ), '[]'::jsonb),
    'trash', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', prayer.id,
        'content', prayer.content,
        'status', prayer.status,
        'created_at', prayer.created_at,
        'deleted_at', prayer.deleted_at,
        'group_names', coalesce((
          select jsonb_agg(app_group.name order by share.created_at)
          from public.prayer_group_shares share
          join public.groups app_group on app_group.id = share.group_id
          where share.prayer_id = prayer.id
        ), '[]'::jsonb)
      ) order by prayer.deleted_at desc)
      from public.prayer_requests prayer
      where prayer.author_id = auth.uid() and prayer.deleted_at is not null
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.notify_notice_published() from public, anon, authenticated;
revoke all on function public.restore_prayers_from_trash(uuid[]) from public, anon;
revoke all on function public.permanently_delete_prayers(uuid[]) from public, anon;
grant execute on function public.restore_prayers_from_trash(uuid[]) to authenticated;
grant execute on function public.permanently_delete_prayers(uuid[]) to authenticated;

notify pgrst, 'reload schema';
