-- PrayNote initial schema
-- Run with the Supabase CLI or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create type public.group_role as enum ('member', 'admin', 'leader');
create type public.membership_status as enum ('pending', 'active', 'rejected');
create type public.prayer_status as enum ('active', 'completed');
create type public.notification_type as enum (
  'new_prayer',
  'prayer_response',
  'membership_requested',
  'membership_approved',
  'membership_rejected',
  'role_changed',
  'group_updated'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 50),
  description text check (description is null or char_length(description) <= 500),
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  status public.membership_status not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null check (char_length(trim(content)) between 1 and 2000),
  status public.prayer_status not null default 'active',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id),
  constraint completed_state_consistent check (
    (status = 'active' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create table public.prayer_responses (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prayed_on date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now(),
  unique (prayer_id, user_id, prayed_on)
);

create table public.prayer_reads (
  prayer_id uuid not null references public.prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_read_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  group_id uuid references public.groups(id) on delete cascade,
  prayer_id uuid references public.prayer_requests(id) on delete cascade,
  type public.notification_type not null,
  event_key text unique,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app_enabled boolean not null default true,
  new_prayer_enabled boolean not null default true,
  prayer_response_enabled boolean not null default true,
  membership_enabled boolean not null default true,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index group_memberships_user_status_idx on public.group_memberships(user_id, status);
create index group_memberships_group_status_idx on public.group_memberships(group_id, status);
create index prayer_requests_group_created_idx on public.prayer_requests(group_id, created_at desc);
create index prayer_requests_author_created_idx on public.prayer_requests(author_id, created_at desc);
create index prayer_requests_group_status_created_idx on public.prayer_requests(group_id, status, created_at desc);
create index prayer_responses_prayer_idx on public.prayer_responses(prayer_id);
create index prayer_responses_user_date_idx on public.prayer_responses(user_id, prayed_on desc);
create index notifications_recipient_read_created_idx on public.notifications(recipient_id, read_at, created_at desc);
create index audit_logs_group_created_idx on public.audit_logs(group_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.group_memberships
for each row execute function public.set_updated_at();
create trigger prayers_set_updated_at before update on public.prayer_requests
for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

create or replace function public.protect_prayer_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.group_id <> old.group_id or new.author_id <> old.author_id then
    raise exception 'immutable_prayer_ownership';
  end if;

  if (new.hidden_at is distinct from old.hidden_at or new.hidden_by is distinct from old.hidden_by)
     and not exists (
       select 1 from public.group_memberships gm
       where gm.group_id = old.group_id
         and gm.user_id = auth.uid()
         and gm.status = 'active'
         and gm.role in ('admin', 'leader')
     ) then
    raise exception 'moderator_permission_required';
  end if;

  return new;
end;
$$;

create trigger prayers_protect_fields before update on public.prayer_requests
for each row execute function public.protect_prayer_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_name text;
begin
  candidate_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    '새 사용자'
  );

  if char_length(candidate_name) < 2 then
    candidate_name := candidate_name || '님';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(candidate_name, 30));

  insert into public.notification_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_active_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
      and gm.status = 'active'
      and g.deleted_at is null
  );
$$;

create or replace function public.has_group_role(target_group_id uuid, allowed_roles public.group_role[], target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
      and gm.status = 'active'
      and gm.role = any(allowed_roles)
      and g.deleted_at is null
  );
$$;

create or replace function public.shares_active_group(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships first_membership
    join public.group_memberships second_membership
      on second_membership.group_id = first_membership.group_id
    join public.groups g on g.id = first_membership.group_id
    where first_membership.user_id = first_user_id
      and second_membership.user_id = second_user_id
      and first_membership.status = 'active'
      and second_membership.status = 'active'
      and g.deleted_at is null
  );
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'PRAY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.groups where invite_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_group(group_name text, group_description text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if char_length(trim(group_name)) not between 2 and 50 then raise exception 'invalid_group_name'; end if;
  if group_description is not null and char_length(group_description) > 500 then raise exception 'invalid_group_description'; end if;

  insert into public.groups (name, description, invite_code, created_by)
  values (trim(group_name), nullif(trim(group_description), ''), public.generate_invite_code(), auth.uid())
  returning id into new_group_id;

  insert into public.group_memberships (group_id, user_id, role, status, reviewed_by, reviewed_at)
  values (new_group_id, auth.uid(), 'leader', 'active', auth.uid(), now());

  insert into public.audit_logs (group_id, actor_id, action)
  values (new_group_id, auth.uid(), 'group.created');

  return new_group_id;
end;
$$;

create or replace function public.get_join_group_preview(target_group_id uuid)
returns table (id uuid, name text, description text)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.description
  from public.groups g
  where g.id = target_group_id and g.deleted_at is null;
$$;

create or replace function public.request_group_membership(target_group_id uuid, submitted_code text)
returns public.membership_status
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_code text;
  current_status public.membership_status;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select g.invite_code into expected_code
  from public.groups g
  where g.id = target_group_id and g.deleted_at is null;

  if expected_code is null then raise exception 'group_not_found'; end if;
  if upper(trim(submitted_code)) <> expected_code then raise exception 'invalid_invite_code'; end if;

  select gm.status into current_status
  from public.group_memberships gm
  where gm.group_id = target_group_id and gm.user_id = auth.uid();

  if current_status = 'active' then return current_status; end if;
  if current_status = 'pending' then return current_status; end if;

  insert into public.group_memberships (group_id, user_id, role, status, requested_at, reviewed_by, reviewed_at)
  values (target_group_id, auth.uid(), 'member', 'pending', now(), null, null)
  on conflict (group_id, user_id) do update
    set status = 'pending', requested_at = now(), reviewed_by = null, reviewed_at = null, updated_at = now();

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key)
  select gm.user_id, auth.uid(), target_group_id, 'membership_requested',
         'membership_requested:' || target_group_id::text || ':' || auth.uid()::text || ':' || extract(epoch from now())::bigint::text
  from public.group_memberships gm
  where gm.group_id = target_group_id
    and gm.status = 'active'
    and gm.role in ('admin', 'leader');

  return 'pending';
end;
$$;

create or replace function public.review_membership(membership_id uuid, approve boolean)
returns public.membership_status
language plpgsql
security definer
set search_path = public
as $$
declare
  target_membership public.group_memberships%rowtype;
  new_status public.membership_status;
begin
  select * into target_membership
  from public.group_memberships
  where id = membership_id
  for update;

  if target_membership.id is null then raise exception 'membership_not_found'; end if;
  if not public.has_group_role(target_membership.group_id, array['admin', 'leader']::public.group_role[]) then
    raise exception 'permission_denied';
  end if;
  if target_membership.status <> 'pending' then raise exception 'membership_not_pending'; end if;

  new_status := case when approve then 'active'::public.membership_status else 'rejected'::public.membership_status end;

  update public.group_memberships
  set status = new_status, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = membership_id;

  insert into public.notifications (recipient_id, actor_id, group_id, type, event_key)
  values (
    target_membership.user_id,
    auth.uid(),
    target_membership.group_id,
    case when approve then 'membership_approved'::public.notification_type else 'membership_rejected'::public.notification_type end,
    'membership_reviewed:' || membership_id::text || ':' || new_status::text
  ) on conflict (event_key) do nothing;

  insert into public.audit_logs (group_id, actor_id, target_user_id, action)
  values (
    target_membership.group_id,
    auth.uid(),
    target_membership.user_id,
    case when approve then 'membership.approved' else 'membership.rejected' end
  );

  return new_status;
end;
$$;

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

create or replace function public.notify_new_prayer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, group_id, prayer_id, type, event_key)
  select gm.user_id, new.author_id, new.group_id, new.id, 'new_prayer',
         'new_prayer:' || new.id::text || ':' || gm.user_id::text
  from public.group_memberships gm
  join public.notification_preferences np on np.user_id = gm.user_id
  where gm.group_id = new.group_id
    and gm.status = 'active'
    and gm.user_id <> new.author_id
    and np.in_app_enabled
    and np.new_prayer_enabled
  on conflict (event_key) do nothing;
  return new;
end;
$$;

create trigger prayer_created_notify
after insert on public.prayer_requests
for each row execute function public.notify_new_prayer();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.prayer_responses enable row level security;
alter table public.prayer_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_shared_group on public.profiles
for select to authenticated
using (id = auth.uid() or public.shares_active_group(auth.uid(), id));

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy groups_select_member on public.groups
for select to authenticated
using (public.is_active_group_member(id));

create policy memberships_select_allowed on public.group_memberships
for select to authenticated
using (
  user_id = auth.uid()
  or (status = 'active' and public.is_active_group_member(group_id))
  or public.has_group_role(group_id, array['admin', 'leader']::public.group_role[])
);

create policy prayers_select_member on public.prayer_requests
for select to authenticated
using (
  deleted_at is null
  and hidden_at is null
  and public.is_active_group_member(group_id)
);

create policy prayers_insert_self on public.prayer_requests
for insert to authenticated
with check (author_id = auth.uid() and public.is_active_group_member(group_id));

create policy prayers_update_owner on public.prayer_requests
for update to authenticated
using (author_id = auth.uid() and public.is_active_group_member(group_id))
with check (author_id = auth.uid() and public.is_active_group_member(group_id));

create policy responses_select_member on public.prayer_responses
for select to authenticated
using (
  exists (
    select 1 from public.prayer_requests pr
    where pr.id = prayer_id and public.is_active_group_member(pr.group_id)
  )
);

create policy reads_select_owner_or_author on public.prayer_reads
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.prayer_requests pr
    where pr.id = prayer_id and pr.author_id = auth.uid()
  )
);

create policy reads_insert_self on public.prayer_reads
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.prayer_requests pr
    where pr.id = prayer_id and public.is_active_group_member(pr.group_id)
  )
);

create policy reads_update_self on public.prayer_reads
for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_select_self on public.notifications
for select to authenticated
using (recipient_id = auth.uid());

create policy notifications_update_self on public.notifications
for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy preferences_select_self on public.notification_preferences
for select to authenticated
using (user_id = auth.uid());

create policy preferences_update_self on public.notification_preferences
for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_logs_select_leader on public.audit_logs
for select to authenticated
using (public.has_group_role(group_id, array['leader']::public.group_role[]));

revoke all on function public.generate_invite_code() from public, anon, authenticated;
grant execute on function public.is_active_group_member(uuid, uuid) to authenticated;
grant execute on function public.has_group_role(uuid, public.group_role[], uuid) to authenticated;
grant execute on function public.shares_active_group(uuid, uuid) to authenticated;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.get_join_group_preview(uuid) to anon, authenticated;
grant execute on function public.request_group_membership(uuid, text) to authenticated;
grant execute on function public.review_membership(uuid, boolean) to authenticated;
grant execute on function public.toggle_prayer_response(uuid) to authenticated;

alter publication supabase_realtime add table public.prayer_requests;
alter publication supabase_realtime add table public.prayer_responses;
alter publication supabase_realtime add table public.group_memberships;
alter publication supabase_realtime add table public.notifications;
