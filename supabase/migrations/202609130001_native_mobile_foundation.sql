-- Native app installations are separate from Web Push subscriptions.
-- APNs/FCM credentials are connected later without changing the client schema.

create table if not exists public.native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  installation_id text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, installation_id)
);

create index if not exists native_push_tokens_user_idx
on public.native_push_tokens(user_id);

drop trigger if exists native_push_tokens_set_updated_at
on public.native_push_tokens;
create trigger native_push_tokens_set_updated_at
before update on public.native_push_tokens
for each row execute function public.set_updated_at();

alter table public.native_push_tokens enable row level security;

drop policy if exists native_push_tokens_select_self
on public.native_push_tokens;
create policy native_push_tokens_select_self
on public.native_push_tokens for select to authenticated
using (user_id = auth.uid());

drop policy if exists native_push_tokens_insert_self
on public.native_push_tokens;
create policy native_push_tokens_insert_self
on public.native_push_tokens for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists native_push_tokens_update_self
on public.native_push_tokens;
create policy native_push_tokens_update_self
on public.native_push_tokens for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists native_push_tokens_delete_self
on public.native_push_tokens;
create policy native_push_tokens_delete_self
on public.native_push_tokens for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete
on table public.native_push_tokens to authenticated;

create or replace function public.register_native_push_token(
  target_token text,
  target_platform text,
  target_installation_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if target_platform not in ('ios', 'android') then
    raise exception 'Unsupported push platform';
  end if;
  if nullif(trim(target_token), '') is null
     or nullif(trim(target_installation_id), '') is null then
    raise exception 'Push token and installation ID are required';
  end if;

  delete from public.native_push_tokens
  where token = target_token
     or (user_id = auth.uid() and installation_id = target_installation_id);

  insert into public.native_push_tokens (
    user_id,
    token,
    platform,
    installation_id,
    last_seen_at
  ) values (
    auth.uid(),
    target_token,
    target_platform,
    target_installation_id,
    now()
  );
end;
$$;

create or replace function public.unregister_native_push_token(
  target_token text
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.native_push_tokens
  where user_id = auth.uid() and token = target_token;
$$;

revoke all on function public.register_native_push_token(text, text, text)
from public, anon;
revoke all on function public.unregister_native_push_token(text)
from public, anon;
grant execute on function public.register_native_push_token(text, text, text)
to authenticated;
grant execute on function public.unregister_native_push_token(text)
to authenticated;

notify pgrst, 'reload schema';
