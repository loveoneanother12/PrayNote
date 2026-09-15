-- Reliable, provider-neutral push delivery for Web Push and native FCM tokens.

alter table public.native_push_tokens
  add column if not exists provider text not null default 'fcm'
    check (provider in ('fcm', 'apns')),
  add column if not exists app_version text;

create table if not exists public.native_push_delivery_attempts (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  token_id uuid not null references public.native_push_tokens(id) on delete cascade,
  status text not null check (status in ('sending', 'delivered', 'failed')),
  error_code text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  primary key (notification_id, token_id)
);

alter table public.native_push_delivery_attempts enable row level security;
revoke all on table public.native_push_delivery_attempts from anon, authenticated;

create table if not exists public.push_outbox (
  notification_id uuid primary key references public.notifications(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_outbox_due_idx
on public.push_outbox(next_attempt_at, created_at)
where status in ('pending', 'processing');

drop trigger if exists push_outbox_set_updated_at on public.push_outbox;
create trigger push_outbox_set_updated_at
before update on public.push_outbox
for each row execute function public.set_updated_at();

alter table public.push_outbox enable row level security;
revoke all on table public.push_outbox from anon, authenticated;

create or replace function public.claim_push_outbox(target_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare claimed_count integer;
begin
  update public.push_outbox
  set status = 'processing',
      claimed_at = now(),
      attempt_count = attempt_count + 1,
      last_error = null
  where notification_id = target_notification_id
    and (
      (status = 'pending' and next_attempt_at <= now())
      or (status = 'processing' and claimed_at < now() - interval '5 minutes')
    )
    and attempt_count < 6;
  get diagnostics claimed_count = row_count;
  return claimed_count = 1;
end;
$$;

create or replace function public.complete_push_outbox(target_notification_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_outbox
  set status = 'delivered', delivered_at = now(), claimed_at = null, last_error = null
  where notification_id = target_notification_id;
$$;

create or replace function public.fail_push_outbox(target_notification_id uuid, failure_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_outbox
  set status = case when attempt_count >= 6 then 'failed' else 'pending' end,
      next_attempt_at = now() + make_interval(secs => least(900, 15 * power(2, greatest(attempt_count - 1, 0)))::integer),
      claimed_at = null,
      last_error = left(coalesce(failure_code, 'delivery_failed'), 120)
  where notification_id = target_notification_id;
end;
$$;

revoke all on function public.claim_push_outbox(uuid) from public, anon, authenticated;
revoke all on function public.complete_push_outbox(uuid) from public, anon, authenticated;
revoke all on function public.fail_push_outbox(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_push_outbox(uuid) to service_role;
grant execute on function public.complete_push_outbox(uuid) to service_role;
grant execute on function public.fail_push_outbox(uuid, text) to service_role;

create or replace function public.enqueue_push_delivery()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare webhook_secret text;
begin
  insert into public.push_outbox(notification_id)
  values (new.id)
  on conflict do nothing;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  order by created_at desc
  limit 1;

  if webhook_secret is not null then
    perform net.http_post(
      url := 'https://praynote.app/api/push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-praynote-push-secret', webhook_secret
      ),
      body := jsonb_build_object('notification_id', new.id),
      timeout_milliseconds := 5000
    );
  end if;
  return new;
exception when others then
  raise warning 'Unable to enqueue push for notification %', new.id;
  return new;
end;
$$;

drop trigger if exists notifications_enqueue_browser_push on public.notifications;
drop trigger if exists notifications_enqueue_push_delivery on public.notifications;
create trigger notifications_enqueue_push_delivery
after insert on public.notifications
for each row execute function public.enqueue_push_delivery();

revoke all on function public.enqueue_push_delivery() from public, anon, authenticated;

create or replace function public.dispatch_due_push_outbox()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  webhook_secret text;
  due record;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  order by created_at desc
  limit 1;
  if webhook_secret is null then raise exception 'push_webhook_secret_missing'; end if;

  for due in
    select notification_id
    from public.push_outbox
    where (
      (status = 'pending' and next_attempt_at <= now())
      or (status = 'processing' and claimed_at < now() - interval '5 minutes')
    )
      and attempt_count < 6
    order by next_attempt_at, created_at
    limit 100
  loop
    perform net.http_post(
      url := 'https://praynote.app/api/push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-praynote-push-secret', webhook_secret
      ),
      body := jsonb_build_object('notification_id', due.notification_id),
      timeout_milliseconds := 10000
    );
  end loop;
end;
$$;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'praynote-push-outbox') then
    perform cron.schedule(
      'praynote-push-outbox',
      '* * * * *',
      'select public.dispatch_due_push_outbox()'
    );
  end if;
end;
$$;

revoke all on function public.dispatch_due_push_outbox() from public, anon, authenticated;

notify pgrst, 'reload schema';
