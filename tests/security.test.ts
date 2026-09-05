import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const initialSchema = readFileSync(join(root, "supabase/migrations/202609040001_initial_schema.sql"), "utf8");
const pushSchema = readFileSync(join(root, "supabase/migrations/202609040006_browser_push.sql"), "utf8");
const reminderSchema = readFileSync(join(root, "supabase/migrations/202609040007_prayer_reminders.sql"), "utf8");
const sharedPrayerSchema = readFileSync(join(root, "supabase/migrations/202609040008_personal_and_shared_prayers.sql"), "utf8");
const hardenedPushSchema = readFileSync(join(root, "supabase/migrations/202609050001_harden_push_delivery.sql"), "utf8");
const performanceSchema = readFileSync(join(root, "supabase/migrations/202609050002_performance_read_models.sql"), "utf8");
const bundleSchema = readFileSync(join(root, "supabase/migrations/202609050003_ultra_performance.sql"), "utf8");
const multiApproverJoinSchema = readFileSync(join(root, "supabase/migrations/202609050004_fix_multi_approver_join.sql"), "utf8");
const dashboardCountSchema = readFileSync(join(root, "supabase/migrations/202609050005_dashboard_scope_counts.sql"), "utf8");
const profileColorSchema = readFileSync(join(root, "supabase/migrations/202609060001_profile_colors_and_prayer_tools.sql"), "utf8");
const safeAnonymousBundleSchema = readFileSync(join(root, "supabase/migrations/202609060002_safe_anonymous_bundle_entry.sql"), "utf8");

describe("security guardrails", () => {
  it("enables row-level security for every user-data table", () => {
    const protectedTables = [
      "profiles",
      "groups",
      "group_memberships",
      "prayer_requests",
      "prayer_responses",
      "prayer_reads",
      "notifications",
      "notification_preferences",
      "audit_logs",
    ];

    for (const table of protectedTables) {
      expect(initialSchema).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("does not expose a service-role credential in browser configuration", () => {
    const browserClient = readFileSync(join(root, "lib/supabase/client.ts"), "utf8");
    const environmentExample = readFileSync(join(root, ".env.example"), "utf8");
    expect(browserClient).not.toMatch(/service[_-]?role/i);
    expect(environmentExample).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY=\S+/);
  });

  it("protects browser push subscriptions with per-user RLS", () => {
    expect(pushSchema).toContain("alter table public.push_subscriptions enable row level security;");
    expect(pushSchema).toContain("using (user_id = auth.uid())");
    expect(pushSchema).toContain("with check (user_id = auth.uid())");
    expect(pushSchema).toContain("revoke all on table public.push_delivery_attempts from anon, authenticated;");
  });

  it("authenticates database webhooks before sending pushes", () => {
    const pushRoute = readFileSync(join(root, "app/api/push/route.ts"), "utf8");
    expect(pushRoute).toContain("timingSafeEqual");
    expect(pushRoute).toContain("x-praynote-push-secret");
  });

  it("protects reminder times and enforces the five-time limit", () => {
    expect(reminderSchema).toContain("alter table public.prayer_reminder_times enable row level security;");
    expect(reminderSchema).toContain("user_id = auth.uid()");
    expect(reminderSchema).toContain(">= 5");
    expect(reminderSchema).toContain("pg_advisory_xact_lock");
  });

  it("dispatches daily reminders through an authenticated cron webhook", () => {
    const reminderRoute = readFileSync(join(root, "app/api/push/reminder/route.ts"), "utf8");
    expect(reminderSchema).toContain("praynote-daily-prayer-reminders");
    expect(reminderSchema).toContain("Asia/Seoul");
    expect(reminderSchema).toContain("on conflict do nothing");
    expect(reminderRoute).toContain("timingSafeEqual");
    expect(reminderRoute).toContain("x-praynote-push-secret");
  });

  it("keeps personal prayers private and validates every shared group", () => {
    expect(sharedPrayerSchema).toContain("create table public.prayer_group_shares");
    expect(sharedPrayerSchema).toContain("alter table public.prayer_group_shares enable row level security;");
    expect(sharedPrayerSchema).toContain("prayer.author_id = target_user_id");
    expect(sharedPrayerSchema).toContain("public.is_active_group_member(candidate.group_id)");
    expect(sharedPrayerSchema).toContain("normalized_group_ids := array[]::uuid[]");
  });

  it("exposes shared-prayer mutations only through authenticated RPCs", () => {
    expect(sharedPrayerSchema).toContain("revoke all on function public.create_prayer_with_groups(text, uuid[], boolean) from public, anon;");
    expect(sharedPrayerSchema).toContain("grant execute on function public.create_prayer_with_groups(text, uuid[], boolean) to authenticated;");
    expect(sharedPrayerSchema).toContain("grant execute on function public.share_prayer_with_groups(uuid, uuid[]) to authenticated;");
  });

  it("fails visibly when push authentication is missing and tolerates short scheduler delays", () => {
    expect(hardenedPushSchema).toContain("raise exception 'push_webhook_secret_missing'");
    expect(hardenedPushSchema).toContain("interval '4 minutes'");
    expect(hardenedPushSchema).toContain("timeout_milliseconds := 10000");
  });

  it("keeps accelerated read models scoped to the signed-in user", () => {
    expect(performanceSchema).toContain("public.can_access_prayer(prayer.id, auth.uid())");
    expect(performanceSchema).toContain("notification.recipient_id = auth.uid()");
    expect(performanceSchema).toContain("membership.user_id = auth.uid()");
    expect(performanceSchema).toMatch(/revoke all on function public\.get_prayer_summaries_fast[\s\S]+from public, anon;/);
    expect(performanceSchema).toContain("grant execute on function public.get_dashboard_overview() to authenticated;");
  });

  it("guards screen bundle data with the authenticated user id", () => {
    expect(bundleSchema).toContain("case when auth.uid() is null then null");
    expect(bundleSchema).toMatch(/revoke all on function public\.get_dashboard_bundle_fast\(\) from public, anon;/);
    expect(bundleSchema).toContain("grant execute on function public.get_dashboard_bundle_fast() to authenticated;");
    expect(bundleSchema).toContain("where notification.recipient_id = auth.uid()");
    expect(bundleSchema).toContain("where reminder.user_id = auth.uid()");
    expect(safeAnonymousBundleSchema).toContain("grant execute on function public.get_dashboard_bundle_fast() to anon;");
    expect(profileColorSchema).toContain("case when auth.uid() is null then null");
    expect(profileColorSchema).toContain("membership.user_id = auth.uid()");
  });

  it("gives every membership approver a unique notification event key", () => {
    expect(multiApproverJoinSchema).toContain("membership.user_id::text");
    expect(multiApproverJoinSchema).toContain("request_event_id::text");
    expect(multiApproverJoinSchema).toContain("membership.role in ('admin', 'leader')");
    expect(multiApproverJoinSchema).toContain("grant execute on function public.request_group_membership(uuid, text) to authenticated;");
  });

  it("counts only private prayers and prayers from active memberships", () => {
    expect(dashboardCountSchema).toContain("prayer.author_id = auth.uid()");
    expect(dashboardCountSchema).toContain("membership.user_id = auth.uid()");
    expect(dashboardCountSchema).toContain("membership.status = 'active'");
    expect(dashboardCountSchema).toContain("app_group.deleted_at is null");
    expect(dashboardCountSchema).toContain("count(distinct prayer.id) as prayer_count");
  });
});
