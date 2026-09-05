import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("performance read paths", () => {
  it("uses the local session instead of a remote user lookup on page renders", () => {
    const auth = read("lib/auth.ts");
    const proxy = read("proxy.ts");
    expect(auth).toContain("auth.getSession()");
    expect(proxy).toContain("auth.getSession()");
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

  it("loads the entire dashboard with one database round trip", () => {
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain("getDashboardBundle(supabase)");
    expect(dashboard).not.toContain("getDashboardOverview(supabase)");
    expect(dashboard).not.toContain("supabase.from(");
  });

  it("places server functions beside the Seoul database and uses Turbopack locally", () => {
    const vercel = JSON.parse(read("vercel.json")) as { regions?: string[] };
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    expect(vercel.regions).toEqual(["icn1"]);
    expect(packageJson.scripts?.dev).toContain("--turbopack");
  });

  it("uses optimistic browser mutations for frequent prayer interactions", () => {
    const actions = read("components/instant-prayer-actions.tsx");
    expect(actions).toContain('rpc("toggle_prayer_response"');
    expect(actions).toContain("setHasPrayed(next)");
    expect(actions).toContain("disabled={pending}");
    expect(actions).toContain("router.refresh()");
  });
});
