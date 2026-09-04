-- Up to five recurring prayer reminder times per user, evaluated in Korea time.

create extension if not exists pg_cron;

create table public.prayer_reminder_times (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  time_local time not null check (date_part('second', time_local) = 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, time_local)
);

create table public.prayer_reminder_deliveries (
  reminder_id uuid not null references public.prayer_reminder_times(id) on delete cascade,
  delivery_date date not null,
  created_at timestamptz not null default now(),
  primary key (reminder_id, delivery_date)
);

create index prayer_reminder_times_due_idx on public.prayer_reminder_times(time_local)
where enabled = true;

create trigger prayer_reminder_times_set_updated_at
before update on public.prayer_reminder_times
for each row execute function public.set_updated_at();

create or replace function public.limit_prayer_reminder_times()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.prayer_reminder_times where user_id = new.user_id) >= 5 then
    raise exception 'reminder_limit_reached';
  end if;
  return new;
end;
$$;

create trigger prayer_reminder_times_limit
before insert on public.prayer_reminder_times
for each row execute function public.limit_prayer_reminder_times();

alter table public.prayer_reminder_times enable row level security;
alter table public.prayer_reminder_deliveries enable row level security;

create policy prayer_reminders_select_self on public.prayer_reminder_times
for select to authenticated using (user_id = auth.uid());

create policy prayer_reminders_insert_self on public.prayer_reminder_times
for insert to authenticated with check (user_id = auth.uid());

create policy prayer_reminders_update_self on public.prayer_reminder_times
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy prayer_reminders_delete_self on public.prayer_reminder_times
for delete to authenticated using (user_id = auth.uid());

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

  if webhook_secret is null then return; end if;

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
        and date_trunc('minute', local_now::date + reminder.time_local) = local_now
      on conflict do nothing
      returning reminder_id
    )
    select claimed.reminder_id, reminder.user_id
    from claimed
    join public.prayer_reminder_times reminder on reminder.id = claimed.reminder_id
  loop
    perform net.http_post(
      url := 'https://ourpraynote.vercel.app/api/push/reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-praynote-push-secret', webhook_secret
      ),
      body := jsonb_build_object(
        'user_id', due.user_id,
        'reminder_id', due.reminder_id,
        'delivery_date', local_now::date
      ),
      timeout_milliseconds := 5000
    );
  end loop;
end;
$$;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'praynote-daily-prayer-reminders') then
    perform cron.schedule(
      'praynote-daily-prayer-reminders',
      '* * * * *',
      'select public.dispatch_due_prayer_reminders()'
    );
  end if;
end;
$$;

revoke all on table public.prayer_reminder_deliveries from anon, authenticated;
revoke all on function public.limit_prayer_reminder_times() from public, anon, authenticated;
revoke all on function public.dispatch_due_prayer_reminders() from public, anon, authenticated;
