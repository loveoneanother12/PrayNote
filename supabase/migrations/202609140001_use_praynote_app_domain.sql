-- Move production push webhooks to the canonical praynote.app domain.

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
    url := 'https://praynote.app/api/push',
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

create or replace function public.dispatch_due_prayer_reminders()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  webhook_secret text;
  local_now timestamp := date_trunc('minute', now() at time zone 'Asia/Seoul');
  due record;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  order by created_at desc
  limit 1;

  if webhook_secret is null then
    raise exception 'push_webhook_secret_missing';
  end if;

  delete from public.prayer_reminder_deliveries
  where delivery_date < (local_now::date - 30);

  for due in
    with claimed as (
      insert into public.prayer_reminder_deliveries (reminder_id, delivery_date)
      select reminder.id, local_now::date
      from public.prayer_reminder_times reminder
      join public.notification_preferences preferences on preferences.user_id = reminder.user_id
      where reminder.enabled = true
        and preferences.push_enabled = true
        and (local_now::date + reminder.time_local) between (local_now - interval '4 minutes') and local_now
      on conflict do nothing
      returning reminder_id
    )
    select claimed.reminder_id, reminder.user_id
    from claimed
    join public.prayer_reminder_times reminder on reminder.id = claimed.reminder_id
  loop
    perform net.http_post(
      url := 'https://praynote.app/api/push/reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-praynote-push-secret', webhook_secret
      ),
      body := jsonb_build_object(
        'user_id', due.user_id,
        'reminder_id', due.reminder_id,
        'delivery_date', local_now::date
      ),
      timeout_milliseconds := 10000
    );
  end loop;
end;
$$;

create or replace function public.dispatch_due_quiet_push_summaries()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare webhook_secret text;
begin
  if not exists (
    select 1 from public.deferred_push_events event
    where event.released_at is null
      and event.release_at <= now()
      and (event.claimed_at is null or event.claimed_at < now() - interval '5 minutes')
  ) then return; end if;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  order by created_at desc
  limit 1;

  if webhook_secret is null then raise exception 'push_webhook_secret_missing'; end if;

  perform net.http_post(
    url := 'https://praynote.app/api/push/quiet-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-praynote-push-secret', webhook_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function public.enqueue_browser_push() from public, anon, authenticated;
revoke all on function public.dispatch_due_prayer_reminders() from public, anon, authenticated;
revoke all on function public.dispatch_due_quiet_push_summaries() from public, anon, authenticated;

notify pgrst, 'reload schema';
