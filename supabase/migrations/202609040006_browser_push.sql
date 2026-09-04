-- Store one Web Push subscription per browser installation and enqueue pushes
-- after privacy-filtered in-app notifications are created.

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

create table public.push_delivery_attempts (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null check (status in ('sending', 'delivered', 'failed')),
  error_code text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  primary key (notification_id, subscription_id)
);

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.push_delivery_attempts enable row level security;

create policy push_subscriptions_select_self on public.push_subscriptions
for select to authenticated
using (user_id = auth.uid());

create policy push_subscriptions_insert_self on public.push_subscriptions
for insert to authenticated
with check (user_id = auth.uid());

create policy push_subscriptions_update_self on public.push_subscriptions
for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_subscriptions_delete_self on public.push_subscriptions
for delete to authenticated
using (user_id = auth.uid());

create or replace function public.enqueue_browser_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  webhook_secret text;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  order by created_at desc
  limit 1;

  if webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://ourpraynote.vercel.app/api/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-praynote-push-secret', webhook_secret
    ),
    body := jsonb_build_object('notification_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  raise warning 'Unable to enqueue browser push for notification %', new.id;
  return new;
end;
$$;

create trigger notifications_enqueue_browser_push
after insert on public.notifications
for each row execute function public.enqueue_browser_push();

revoke all on table public.push_delivery_attempts from anon, authenticated;
revoke all on function public.enqueue_browser_push() from public, anon, authenticated;
