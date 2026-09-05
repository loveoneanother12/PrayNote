-- Let signed-out and expired sessions reach the bundle guard so the app can
-- redirect to login instead of surfacing a database permission error.
-- Every function below returns NULL before reading data when auth.uid() is NULL.

grant execute on function public.get_dashboard_bundle_fast() to anon;
grant execute on function public.get_settings_bundle_fast() to anon;
grant execute on function public.get_group_page_bundle_fast(uuid) to anon;
grant execute on function public.get_my_prayers_bundle_fast() to anon;
grant execute on function public.get_prayer_detail_bundle_fast(uuid) to anon;
grant execute on function public.get_notifications_page_bundle_fast(integer) to anon;
grant execute on function public.search_prayers_bundle_fast(text, integer) to anon;
grant execute on function public.get_group_manage_bundle_fast(uuid) to anon;

notify pgrst, 'reload schema';
