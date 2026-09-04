-- Supabase installs pgcrypto outside the public search path. Use PostgreSQL's
-- built-in UUID generator so the security-definer function remains portable.
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

revoke all on function public.generate_invite_code() from public, anon, authenticated;
