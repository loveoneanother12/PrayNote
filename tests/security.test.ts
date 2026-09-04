import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const initialSchema = readFileSync(join(root, "supabase/migrations/202609040001_initial_schema.sql"), "utf8");
const pushSchema = readFileSync(join(root, "supabase/migrations/202609040006_browser_push.sql"), "utf8");

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
});
