-- UGC safety: reports, personal blocks, and non-blocking keyword detection.

create type public.content_report_reason as enum ('spam', 'harassment', 'inappropriate', 'personal_info', 'other');
create type public.moderation_review_status as enum ('pending', 'dismissed', 'hidden', 'deleted');

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  prayer_id uuid references public.prayer_requests(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  reason public.content_report_reason not null,
  details text check (details is null or char_length(details) <= 500),
  content_snapshot text not null,
  author_name_snapshot text not null,
  group_name_snapshot text,
  status public.moderation_review_status not null default 'pending',
  resolution_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index content_reports_reporter_prayer_unique
  on public.content_reports(reporter_id, prayer_id) where reporter_id is not null and prayer_id is not null;
create index content_reports_status_created_idx on public.content_reports(status, created_at desc);
create index user_blocks_blocked_idx on public.user_blocks(blocked_user_id, blocker_id);

create table public.moderation_filter_terms (
  id bigint generated always as identity primary key,
  term text not null unique check (char_length(trim(term)) between 2 and 50),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.moderation_filter_terms(term) values
  ('씨발'), ('병신'), ('개새끼'), ('죽어'), ('오픈채팅'), ('카카오톡 아이디'), ('계좌번호')
on conflict (term) do nothing;

create table public.moderation_keyword_detections (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid references public.prayer_requests(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  matched_terms text[] not null,
  content_snapshot text not null,
  author_name_snapshot text not null,
  group_name_snapshot text,
  content_fingerprint text not null,
  status public.moderation_review_status not null default 'pending',
  resolution_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (prayer_id, content_fingerprint)
);

create index moderation_detections_status_created_idx
  on public.moderation_keyword_detections(status, created_at desc);

alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_filter_terms enable row level security;
alter table public.moderation_keyword_detections enable row level security;
revoke all on public.user_blocks, public.content_reports, public.moderation_filter_terms, public.moderation_keyword_detections from public, anon, authenticated;

create or replace function public.can_access_prayer(target_prayer_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.prayer_requests prayer
    where prayer.id = target_prayer_id
      and prayer.deleted_at is null and prayer.hidden_at is null
      and not exists (
        select 1 from public.user_blocks block
        where block.blocker_id = target_user_id and block.blocked_user_id = prayer.author_id
      )
      and not exists (
        select 1 from public.content_reports report
        where report.reporter_id = target_user_id and report.prayer_id = prayer.id
      )
      and (
        prayer.author_id = target_user_id
        or exists (
          select 1 from public.prayer_group_shares share
          join public.group_memberships membership on membership.group_id = share.group_id
            and membership.user_id = target_user_id and membership.status = 'active'
          join public.groups app_group on app_group.id = share.group_id and app_group.deleted_at is null
          where share.prayer_id = prayer.id
        )
      )
  );
$$;

create or replace function public.report_prayer(target_prayer_id uuid, report_reason public.content_report_reason, report_details text default null)
returns void language plpgsql security definer set search_path = public as $$
declare target public.prayer_requests%rowtype; selected_group uuid; author_name text; group_name text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into target from public.prayer_requests where id = target_prayer_id and deleted_at is null and hidden_at is null;
  if not found or not public.can_access_prayer(target_prayer_id, auth.uid()) then raise exception 'prayer_not_found'; end if;
  if target.author_id is null or target.author_id = auth.uid() then raise exception 'cannot_report_own_prayer'; end if;
  if (select count(*) from public.content_reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'report_rate_limited';
  end if;
  select share.group_id, app_group.name into selected_group, group_name
  from public.prayer_group_shares share join public.groups app_group on app_group.id = share.group_id
  where share.prayer_id = target.id order by share.created_at limit 1;
  select coalesce(display_name, '멤버') into author_name from public.profiles where id = target.author_id;
  insert into public.content_reports(reporter_id, prayer_id, reported_user_id, group_id, reason, details, content_snapshot, author_name_snapshot, group_name_snapshot)
  values(auth.uid(), target.id, target.author_id, selected_group, report_reason, nullif(trim(report_details), ''), target.content, coalesce(author_name, '멤버'), group_name);
end;
$$;

create or replace function public.block_user(target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if target_user_id is null or target_user_id = auth.uid() then raise exception 'cannot_block_self'; end if;
  if exists(select 1 from public.super_admins where user_id = target_user_id) then raise exception 'cannot_block_super_admin'; end if;
  if not exists(select 1 from public.profiles where id = target_user_id) then raise exception 'user_not_found'; end if;
  insert into public.user_blocks(blocker_id, blocked_user_id) values(auth.uid(), target_user_id) on conflict do nothing;
  delete from public.notifications where recipient_id = auth.uid() and actor_id = target_user_id;
end;
$$;

create or replace function public.unblock_user(target_user_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_user_id = target_user_id;
$$;

create or replace function public.get_blocked_users()
returns table(user_id uuid, display_name text, profile_color text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select profile.id, profile.display_name, profile.profile_color, block.created_at
  from public.user_blocks block join public.profiles profile on profile.id = block.blocked_user_id
  where block.blocker_id = auth.uid() order by block.created_at desc;
$$;

create or replace function public.detect_prayer_filter_terms()
returns trigger language plpgsql security definer set search_path = public as $$
declare matches text[]; selected_group uuid; author_name text; group_name text;
begin
  select array_agg(term order by term) into matches from public.moderation_filter_terms
  where enabled and position(lower(term) in lower(new.content)) > 0;
  if coalesce(cardinality(matches), 0) = 0 then return new; end if;
  select share.group_id, app_group.name into selected_group, group_name
  from public.prayer_group_shares share join public.groups app_group on app_group.id = share.group_id
  where share.prayer_id = new.id order by share.created_at limit 1;
  select coalesce(display_name, '멤버') into author_name from public.profiles where id = new.author_id;
  insert into public.moderation_keyword_detections(prayer_id, author_id, group_id, matched_terms, content_snapshot, author_name_snapshot, group_name_snapshot, content_fingerprint)
  values(new.id, new.author_id, selected_group, matches, new.content, coalesce(author_name, '멤버'), group_name, encode(digest(new.content, 'sha256'), 'hex'))
  on conflict (prayer_id, content_fingerprint) do nothing;
  return new;
exception when others then
  raise warning 'Keyword detection failed for prayer %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists prayer_filter_term_detection on public.prayer_requests;
create trigger prayer_filter_term_detection after insert or update of content on public.prayer_requests
for each row execute function public.detect_prayer_filter_terms();

create or replace function public.respect_notification_preferences()
returns trigger language plpgsql security definer set search_path = public as $$
declare preferences public.notification_preferences%rowtype;
begin
  if new.actor_id is not null and exists (
    select 1 from public.user_blocks where blocker_id = new.recipient_id and blocked_user_id = new.actor_id
  ) then return null; end if;
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

create or replace function public.get_notification_summaries_fast(result_limit integer default 50)
returns table(id uuid, actor_id uuid, group_id uuid, prayer_id uuid, type public.notification_type, data jsonb, read_at timestamptz, created_at timestamptz, actor_name text, group_name text)
language sql stable security definer set search_path = public as $$
  select notification.id, notification.actor_id, notification.group_id, notification.prayer_id, notification.type,
         notification.data, notification.read_at, notification.created_at, actor.display_name, app_group.name
  from public.notifications notification
  left join public.profiles actor on actor.id = notification.actor_id
  left join public.groups app_group on app_group.id = notification.group_id
  where auth.uid() is not null and notification.recipient_id = auth.uid()
    and not exists(select 1 from public.user_blocks block where block.blocker_id = auth.uid() and block.blocked_user_id = notification.actor_id)
  order by notification.created_at desc limit least(greatest(coalesce(result_limit, 50), 1), 200);
$$;

alter table public.admin_action_logs drop constraint if exists admin_action_logs_action_check;
alter table public.admin_action_logs add constraint admin_action_logs_action_check check (action in (
  'user.suspended', 'user.unsuspended', 'user.signed_out', 'user.deleted',
  'report.dismissed', 'report.hidden', 'report.deleted', 'detection.dismissed', 'detection.hidden', 'detection.deleted'
));

create or replace function public.get_admin_moderation_center()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_super_admin() then raise exception 'super_admin_required'; end if;
  select jsonb_build_object(
    'pending_report_count', (select count(*) from public.content_reports where status = 'pending'),
    'pending_detection_count', (select count(*) from public.moderation_keyword_detections where status = 'pending'),
    'reports', coalesce((select jsonb_agg(to_jsonb(item) order by item.created_at desc) from (
      select report.id, report.prayer_id, report.reported_user_id, report.group_id, report.reason, report.details,
        report.content_snapshot, report.author_name_snapshot, report.group_name_snapshot, report.status, report.created_at,
        (select count(*) from public.content_reports sibling where sibling.prayer_id = report.prayer_id) report_count
      from public.content_reports report order by report.created_at desc limit 200
    ) item), '[]'::jsonb),
    'detections', coalesce((select jsonb_agg(to_jsonb(item) order by item.created_at desc) from (
      select detection.id, detection.prayer_id, detection.author_id, detection.group_id, detection.matched_terms,
        detection.content_snapshot, detection.author_name_snapshot, detection.group_name_snapshot, detection.status, detection.created_at
      from public.moderation_keyword_detections detection order by detection.created_at desc limit 200
    ) item), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_resolve_moderation_item(item_kind text, target_item_id uuid, decision text)
returns void language plpgsql security definer set search_path = public as $$
declare prayer uuid; next_status public.moderation_review_status; action_name text;
begin
  if not public.is_super_admin() then raise exception 'super_admin_required'; end if;
  if item_kind not in ('report', 'detection') or decision not in ('dismissed', 'hidden', 'deleted') then raise exception 'invalid_decision'; end if;
  next_status := decision::public.moderation_review_status;
  if item_kind = 'report' then
    select prayer_id into prayer from public.content_reports where id = target_item_id for update;
    if not found then raise exception 'item_not_found'; end if;
    update public.content_reports set status = next_status, reviewed_by = auth.uid(), reviewed_at = now() where id = target_item_id;
  else
    select prayer_id into prayer from public.moderation_keyword_detections where id = target_item_id for update;
    if not found then raise exception 'item_not_found'; end if;
    update public.moderation_keyword_detections set status = next_status, reviewed_by = auth.uid(), reviewed_at = now() where id = target_item_id;
  end if;
  if decision = 'hidden' and prayer is not null then update public.prayer_requests set hidden_at = now(), hidden_by = auth.uid() where id = prayer; end if;
  if decision = 'deleted' and prayer is not null then delete from public.prayer_requests where id = prayer; end if;
  action_name := item_kind || '.' || decision;
  insert into public.admin_action_logs(actor_id, action, metadata) values(auth.uid(), action_name, jsonb_build_object('item_id', target_item_id, 'prayer_id', prayer));
end;
$$;

create or replace function public.protect_prayer_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is distinct from old.group_id or (new.author_id is distinct from old.author_id and new.author_id is not null) then raise exception 'immutable_prayer_ownership'; end if;
  if (new.hidden_at is distinct from old.hidden_at or (new.hidden_by is distinct from old.hidden_by and new.hidden_by is not null))
     and not public.is_super_admin()
     and not exists (select 1 from public.prayer_group_shares share where share.prayer_id = old.id and public.has_group_role(share.group_id, array['admin', 'leader']::public.group_role[]))
  then raise exception 'moderator_permission_required'; end if;
  return new;
end;
$$;

revoke all on function public.report_prayer(uuid, public.content_report_reason, text) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.get_blocked_users() from public, anon;
revoke all on function public.get_admin_moderation_center() from public, anon;
revoke all on function public.admin_resolve_moderation_item(text, uuid, text) from public, anon;
grant execute on function public.report_prayer(uuid, public.content_report_reason, text) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.get_blocked_users() to authenticated;
grant execute on function public.get_admin_moderation_center() to authenticated;
grant execute on function public.admin_resolve_moderation_item(text, uuid, text) to authenticated;

create or replace function public.get_settings_bundle_fast()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'is_super_admin', public.is_super_admin(),
    'preferences', coalesce((select to_jsonb(preference) from public.notification_preferences preference where preference.user_id = auth.uid()), '{}'::jsonb),
    'unread_count', (select count(*) from public.notifications notification where notification.recipient_id = auth.uid()
      and notification.read_at is null and not exists(select 1 from public.user_blocks block where block.blocker_id = auth.uid() and block.blocked_user_id = notification.actor_id)),
    'reminder_times', coalesce((select jsonb_agg(jsonb_build_object('id', reminder.id, 'time_local', reminder.time_local) order by reminder.time_local) from public.prayer_reminder_times reminder where reminder.user_id = auth.uid()), '[]'::jsonb),
    'blocked_users', coalesce((select jsonb_agg(to_jsonb(blocked_user) order by blocked_user.blocked_at desc) from public.get_blocked_users() blocked_user), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.get_settings_bundle_fast() from public;
grant execute on function public.get_settings_bundle_fast() to authenticated, anon;

notify pgrst, 'reload schema';
