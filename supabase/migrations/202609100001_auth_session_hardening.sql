-- Restore the signed-out dashboard guard after the group-order migration
-- unintentionally revoked anonymous execution. The function itself returns
-- NULL when auth.uid() is NULL and never exposes user data to anonymous calls.

grant execute on function public.get_dashboard_bundle_fast() to anon;

notify pgrst, 'reload schema';
