-- Expand the profile palette and add a read-only-for-members notice board.

alter table public.profiles drop constraint if exists profiles_profile_color_check;
alter table public.profiles add constraint profiles_profile_color_check check (
  profile_color in (
    'indigo', 'sky', 'teal', 'green', 'amber', 'rose', 'violet', 'slate',
    'coral', 'orange', 'lime', 'mint', 'cyan', 'blue', 'navy', 'grape',
    'magenta', 'red', 'brown', 'charcoal', 'lavender', 'lilac', 'blush',
    'peach', 'butter', 'sage', 'aqua', 'periwinkle'
  )
);

create table if not exists public.super_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;
revoke all on table public.super_admins from anon, authenticated;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (select 1 from public.super_admins admin where admin.user_id = auth.uid());
$$;

revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 100),
  content text not null check (char_length(trim(content)) between 1 and 5000),
  created_by uuid references public.profiles(id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists notices_set_updated_at on public.notices;
create trigger notices_set_updated_at before update on public.notices
for each row execute function public.set_updated_at();

alter table public.notices enable row level security;

drop policy if exists notices_select_authenticated on public.notices;
create policy notices_select_authenticated on public.notices
for select to authenticated
using (is_published or public.is_super_admin());

drop policy if exists notices_insert_super_admin on public.notices;
create policy notices_insert_super_admin on public.notices
for insert to authenticated
with check (public.is_super_admin() and created_by = auth.uid());

drop policy if exists notices_update_super_admin on public.notices;
create policy notices_update_super_admin on public.notices
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists notices_delete_super_admin on public.notices;
create policy notices_delete_super_admin on public.notices
for delete to authenticated
using (public.is_super_admin());

grant select, insert, update, delete on table public.notices to authenticated;

create or replace function public.get_settings_bundle_fast()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'is_super_admin', public.is_super_admin(),
    'preferences', coalesce((select to_jsonb(preference) from public.notification_preferences preference where preference.user_id = auth.uid()), '{}'::jsonb),
    'unread_count', (select count(*) from public.notifications notification where notification.recipient_id = auth.uid() and notification.read_at is null),
    'reminder_times', coalesce((select jsonb_agg(jsonb_build_object('id', reminder.id, 'time_local', reminder.time_local) order by reminder.time_local) from public.prayer_reminder_times reminder where reminder.user_id = auth.uid()), '[]'::jsonb)
  ) end;
$$;

create or replace function public.get_notices_page_bundle_fast()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(), 'email', auth.jwt() ->> 'email',
    'display_name', (select profile.display_name from public.profiles profile where profile.id = auth.uid()),
    'profile_color', (select profile.profile_color from public.profiles profile where profile.id = auth.uid()),
    'unread_count', (select count(*) from public.notifications notification where notification.recipient_id = auth.uid() and notification.read_at is null),
    'is_super_admin', public.is_super_admin(),
    'notices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', notice.id,
        'title', notice.title,
        'content', notice.content,
        'is_published', notice.is_published,
        'created_at', notice.created_at,
        'updated_at', notice.updated_at
      ) order by notice.created_at desc)
      from public.notices notice
      where notice.is_published or public.is_super_admin()
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.get_settings_bundle_fast() from public;
grant execute on function public.get_settings_bundle_fast() to authenticated, anon;
revoke all on function public.get_notices_page_bundle_fast() from public;
grant execute on function public.get_notices_page_bundle_fast() to authenticated, anon;

-- Later designation example (run only in the Supabase SQL editor):
-- insert into public.super_admins (user_id)
-- select id from auth.users where email = 'admin@example.com'
-- on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
