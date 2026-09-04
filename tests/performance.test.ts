import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("performance read paths", () => {
  it("uses locally verified claims instead of a remote user lookup", () => {
    const auth = read("lib/auth.ts");
    const proxy = read("proxy.ts");
    expect(auth).toContain("auth.getClaims()");
    expect(proxy).toContain("auth.getClaims()");
    expect(`${auth}\n${proxy}`).not.toContain("auth.getUser()");
  });

  it("loads each prayer and notification list in one RPC", () => {
    const prayers = read("lib/prayer-queries.ts");
    const notifications = read("lib/notification-queries.ts");
    expect(prayers).toContain('rpc("get_prayer_summaries_fast"');
    expect(notifications).toContain('rpc("get_notification_summaries_fast"');
    expect(prayers).not.toContain(".from(");
    expect(notifications).not.toContain(".from(");
  });

  it("starts all dashboard data reads together", () => {
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain("await Promise.all([");
    expect(dashboard).toContain("getDashboardOverview(supabase)");
    expect(dashboard).not.toContain("supabase.from(");
  });
});
