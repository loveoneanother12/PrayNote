import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("performance read paths", () => {
  it("uses the local session as a routing hint and retains verified claims on auth entry points", () => {
    const auth = read("lib/auth.ts");
    const proxy = read("proxy.ts");
    expect(auth).toContain("auth.getClaims()");
    expect(proxy).toContain("auth.getSession()");
    expect(proxy).toContain("auth.getClaims()");
    expect(proxy).toContain("mustVerifyClaims");
    expect(`${auth}\n${proxy}`).not.toContain("auth.getUser()");
  });

  it("prefetches the fixed tabs and briefly reuses their server payloads", () => {
    const mobileNav = read("components/mobile-nav.tsx");
    const desktopNav = read("components/subpage-nav.tsx");
    const config = read("next.config.ts");
    expect(mobileNav).toContain('href="/groups" prefetch');
    expect(mobileNav).toContain('href="/prayers" prefetch');
    expect(desktopNav).toContain('href="/settings" prefetch');
    expect(config).toContain("staleTimes");
    expect(config).toContain("dynamic: 30");
  });

  it("keeps tab navigation visible while an uncached screen is loading", () => {
    const loading = read("components/tab-page-loading.tsx");
    expect(loading).toContain("<MobileNav active={active}");
    for (const route of ["dashboard", "prayers", "settings", "notifications"]) {
      expect(read(`app/${route}/loading.tsx`)).toContain("<TabPageLoading");
    }
  });

  it("streams supplementary challenge data without blocking the group prayer screen", () => {
    const groupPage = read("app/groups/[groupId]/page.tsx");
    const section = read("components/group-challenges-section.tsx");
    expect(groupPage).toContain("<Suspense fallback=");
    expect(groupPage).toContain("<GroupChallengesSection");
    expect(groupPage).not.toContain("getGroupChallengesBundle(supabase");
    expect(section).toContain("getGroupChallengesBundle(supabase, groupId)");
  });

  it("scopes challenge progress to prayers shared with that challenge group", () => {
    const challengeSchema = read("supabase/migrations/202609100003_group_prayer_challenges.sql");
    expect(challengeSchema).toContain("where share.prayer_id = response_row.prayer_id");
    expect(challengeSchema).toContain("challenge.group_id = share.group_id");
    expect(challengeSchema).toContain("other_share.group_id = candidate.group_id");
  });

  it("loads each prayer and notification list in one RPC", () => {
    const prayers = read("lib/prayer-queries.ts");
    const notifications = read("lib/notification-queries.ts");
    expect(prayers).toContain('rpc("get_prayer_summaries_fast"');
    expect(notifications).toContain('rpc("get_notification_summaries_fast"');
    expect(prayers).not.toContain(".from(");
    expect(notifications).not.toContain(".from(");
  });

  it("loads the entire dashboard with one database round trip", () => {
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain("getDashboardBundle(supabase)");
    expect(dashboard).not.toContain("getDashboardOverview(supabase)");
    expect(dashboard).not.toContain("supabase.from(");
  });

  it("uses explicit scoped dashboard totals instead of expanded list row counts", () => {
    const dashboardQueries = read("lib/dashboard-queries.ts");
    const dashboardUi = read("components/praynote-app.tsx");
    const countSchema = read("supabase/migrations/202609050005_dashboard_scope_counts.sql");
    expect(dashboardQueries).toContain("bundle.counts?.group_count");
    expect(dashboardQueries).toContain("bundle.counts?.prayer_count");
    expect(dashboardUi).toContain("중복 제외");
    expect(countSchema).toContain("count(distinct prayer.id) as prayer_count");
    expect(countSchema).toContain("membership.status = 'active'");
  });

  it("places server functions beside the Seoul database and uses Turbopack locally", () => {
    const vercel = JSON.parse(read("vercel.json")) as { regions?: string[] };
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    expect(vercel.regions).toEqual(["icn1"]);
    expect(packageJson.scripts?.dev).toContain("--turbopack");
  });

  it("uses optimistic browser mutations for frequent prayer interactions", () => {
    const actions = read("components/instant-prayer-actions.tsx");
    const dailyPrayerAction = actions.split("type InstantPrayerStatusButtonProps")[0];
    expect(actions).toContain('rpc("toggle_prayer_response"');
    expect(actions).toContain("setHasPrayed(next)");
    expect(actions).toContain("disabled={pending}");
    expect(dailyPrayerAction).not.toContain("router.refresh()");
  });

  it("switches prayer filters locally instead of refetching the page", () => {
    const filters = read("components/prayer-record-sections.tsx");
    const myPrayers = read("app/prayers/page.tsx");
    const groupPrayers = read("app/groups/[groupId]/page.tsx");
    expect(filters).toContain('setView("active")');
    expect(filters).toContain('setView("resolved")');
    expect(filters).toContain('setView("all")');
    expect(myPrayers).toContain("<PrayerRecordSections");
    expect(groupPrayers).toContain("<PrayerRecordSections");
  });

  it("limits dashboard payloads to the cards the interface can display", () => {
    const migration = read("supabase/migrations/202609060003_dashboard_payload_optimization.sql");
    expect(migration).toContain("'active_prayer_count'");
    expect(migration).toContain("'personal_prayer_count'");
    expect(migration.match(/result_limit => 3/g)).toHaveLength(2);
    expect(migration).toContain("get_notification_summaries_fast(3)");
  });

  it("only refreshes realtime notification data for newly inserted alerts", () => {
    const realtime = read("components/notification-realtime.tsx");
    expect(realtime).toContain('event: "INSERT"');
    expect(realtime).not.toContain('event: "*"');
  });
});
