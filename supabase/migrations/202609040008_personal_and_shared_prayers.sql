-- One canonical prayer can stay private or be shared with several groups.

alter table public.prayer_requests alter column group_id drop not null;
alter table public.prayer_requests drop constraint if exists prayer_requests_group_id_fkey;
alter table public.prayer_requests
  add constraint prayer_requests_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete set null;

create table public.prayer_group_shares (
  prayer_id uuid not null references public.prayer_requests(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  shared_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (prayer_id, group_id)
);

create index prayer_group_shares_group_prayer_idx
  on public.prayer_group_shares(group_id, prayer_id);

insert into public.prayer_group_shares (prayer_id, group_id, shared_by, created_at)
select id, group_id, author_id, created_at
from public.prayer_requests
where group_id is not null
on conflict do nothing;

alter table public.prayer_group_shares enable row level security;

create or replace function public.is_prayer_author(target_prayer_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.prayer_requests
    where id = target_prayer_id and author_id = target_user_id
  );
$$;

create or replace function public.can_access_prayer(target_prayer_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prayer_requests prayer
    where prayer.id = target_prayer_id
      and prayer.deleted_at is null
      and prayer.hidden_at is null
      and (
        prayer.author_id = target_user_id
        or exists (
          select 1
          from public.prayer_group_shares share
          join public.group_memberships membership
            on membership.group_id = share.group_id
           and membership.user_id = target_user_id
           and membership.status = 'active'
          join public.groups app_group
            on app_group.id = share.group_id
           and app_group.deleted_at is null
          where share.prayer_id = prayer.id
        )
      )
  );
$$;

create policy prayer_group_shares_select_allowed on public.prayer_group_shares
for select to authenticated
using (
  public.is_prayer_author(prayer_id)
  or public.is_active_group_member(group_id)
);

drop policy if exists prayers_select_member on public.prayer_requests;
drop policy if exists prayers_insert_self on public.prayer_requests;
drop policy if exists prayers_update_owner on public.prayer_requests;

create policy prayers_select_allowed on public.prayer_requests
for select to authenticated
using (public.can_access_prayer(id));

create policy prayers_insert_self on public.prayer_requests
for insert to authenticated
with check (
  author_id = auth.uid()
  and (group_id is null or public.is_active_group_member(group_id))
);

create policy prayers_update_owner on public.prayer_requests
for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists responses_select_member on public.prayer_responses;
create policy responses_select_allowed on public.prayer_responses
for select to authenticated
using (public.can_access_prayer(prayer_id));

drop policy if exists reads_insert_self on public.prayer_reads;
create policy reads_insert_self on public.prayer_reads
for insert to authenticated
with check (user_id = auth.uid() and public.can_access_prayer(prayer_id));

create or replace function public.protect_prayer_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.group_id is distinct from old.group_id or new.author_id is distinct from old.author_id then
    raise exception 'immutable_prayer_ownership';
  end if;

  if (new.hidden_at is distinct from old.hidden_at or new.hidden_by is distinct from old.hidden_by)
     and not exists (
       select 1
       from public.prayer_group_shares share
       where share.prayer_id = old.id
         and public.has_group_role(share.group_id, array['admin', 'leader']::public.group_role[])
     ) then
    raise exception 'moderator_permission_required';
  end if;

  return new;
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
  notification_group_id uuid;
  today_in_korea date := (now() at time zone 'Asia/Seoul')::date;
  removed_count integer;
begin
  select * into target_prayer
  from public.prayer_requests
  where id = target_prayer_id and deleted_at is null and hidden_at is null;

  if target_prayer.id is null then raise exception 'prayer_not_found'; end if;
  if not public.can_access_prayer(target_prayer_id) then raise exception 'permission_denied'; end if;

  delete from public.prayer_responses
  where prayer_id = target_prayer_id
    and user_id = auth.uid()
    and prayed_on = today_in_korea;
  get diagnostics removed_count = row_count;

  if removed_count > 0 then return false; end if;

  insert into public.prayer_responses (prayer_id, user_id, prayed_on)
  values (target_prayer_id, auth.uid(), today_in_korea);

  if target_prayer.author_id <> auth.uid() then
    select share.group_id into notification_group_id
    from public.prayer_group_shares share
    where share.prayer_id = target_prayer.id
      and public.is_active_group_member(share.group_id)
    order by share.created_at
    limit 1;

    insert into public.notifications (recipient_id, actor_id, group_id, prayer_id, type, event_key)
    values (
      target_prayer.author_id,
      auth.uid(),
      notification_group_id,
      target_prayer.id,
      'prayer_response',
      'prayer_response:' || target_prayer.id::text || ':' || auth.uid()::text || ':' || today_in_korea::text
    ) on conflict (event_key) do nothing;
  end if;

  return true;
end;
$$;

drop trigger if exists prayer_created_notify on public.prayer_requests;

create or replace function public.notify_prayer_shared()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prayer_author uuid;
begin
  select author_id into prayer_author
  from public.prayer_requests
  where id = new.prayer_id;

  insert into public.notifications (recipient_id, actor_id, group_id, prayer_id, type, event_key)
  select membership.user_id, prayer_author, new.group_id, new.prayer_id, 'new_prayer',
         'new_prayer:' || new.prayer_id::text || ':' || new.group_id::text || ':' || membership.user_id::text
  from public.group_memberships membership
  join public.notification_preferences preferences on preferences.user_id = membership.user_id
  where membership.group_id = new.group_id
    and membership.status = 'active'
    and membership.user_id <> prayer_author
    and preferences.in_app_enabled
    and preferences.new_prayer_enabled
  on conflict (event_key) do nothing;

  return new;
end;
$$;

create trigger prayer_shared_notify
after insert on public.prayer_group_shares
for each row execute function public.notify_prayer_shared();

create or replace function public.create_prayer_with_groups(
  prayer_content text,
  target_group_ids uuid[],
  is_personal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_group_ids uuid[];
  new_prayer_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if char_length(trim(prayer_content)) not between 1 and 2000 then raise exception 'invalid_content'; end if;

  select coalesce(array_agg(distinct candidate.group_id), array[]::uuid[])
  into normalized_group_ids
  from unnest(coalesce(target_group_ids, array[]::uuid[])) as candidate(group_id);

  if is_personal then
    normalized_group_ids := array[]::uuid[];
  elsif cardinality(normalized_group_ids) = 0 then
    raise exception 'group_required';
  end if;

  if cardinality(normalized_group_ids) > 20 then raise exception 'too_many_groups'; end if;

  if exists (
    select 1 from unnest(normalized_group_ids) as candidate(group_id)
    where not public.is_active_group_member(candidate.group_id)
  ) then
    raise exception 'permission_denied';
  end if;

  insert into public.prayer_requests (group_id, author_id, content)
  values (normalized_group_ids[1], auth.uid(), trim(prayer_content))
  returning id into new_prayer_id;

  insert into public.prayer_group_shares (prayer_id, group_id, shared_by)
  select new_prayer_id, candidate.group_id, auth.uid()
  from unnest(normalized_group_ids) as candidate(group_id);

  return new_prayer_id;
end;
$$;

create or replace function public.share_prayer_with_groups(
  target_prayer_id uuid,
  target_group_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_group_ids uuid[];
  inserted_count integer;
begin
  if not public.is_prayer_author(target_prayer_id) then raise exception 'permission_denied'; end if;

  select coalesce(array_agg(distinct candidate.group_id), array[]::uuid[])
  into normalized_group_ids
  from unnest(coalesce(target_group_ids, array[]::uuid[])) as candidate(group_id);

  if exists (
    select 1 from unnest(normalized_group_ids) as candidate(group_id)
    where not public.is_active_group_member(candidate.group_id)
  ) then
    raise exception 'permission_denied';
  end if;

  insert into public.prayer_group_shares (prayer_id, group_id, shared_by)
  select target_prayer_id, candidate.group_id, auth.uid()
  from unnest(normalized_group_ids) as candidate(group_id)
  on conflict do nothing;
  get diagnostics inserted_count = row_count;

  return inserted_count;
end;
$$;

revoke all on function public.is_prayer_author(uuid, uuid) from public, anon;
revoke all on function public.can_access_prayer(uuid, uuid) from public, anon;
revoke all on function public.notify_prayer_shared() from public, anon, authenticated;
revoke all on function public.create_prayer_with_groups(text, uuid[], boolean) from public, anon;
revoke all on function public.share_prayer_with_groups(uuid, uuid[]) from public, anon;
grant execute on function public.create_prayer_with_groups(text, uuid[], boolean) to authenticated;
grant execute on function public.share_prayer_with_groups(uuid, uuid[]) to authenticated;
grant execute on function public.toggle_prayer_response(uuid) to authenticated;
grant execute on function public.is_prayer_author(uuid, uuid) to authenticated;
grant execute on function public.can_access_prayer(uuid, uuid) to authenticated;
