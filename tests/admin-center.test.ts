import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("super-admin center", () => {
  it("guards every database operation with the super-admin role", () => {
    const migration = read("supabase/migrations/202609090005_admin_center.sql");
    expect(migration.match(/if not public\.is_super_admin\(\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration).toContain("revoke all on table public.admin_action_logs from public, anon, authenticated");
    expect(migration).toContain("raise exception 'cannot_manage_self'");
    expect(migration).toContain("raise exception 'cannot_manage_super_admin'");
  });

  it("provides privacy-preserving aggregate insights without prayer content", () => {
    const migration = read("supabase/migrations/202609090005_admin_center.sql");
    const insights = migration.slice(migration.indexOf("get_admin_insights"), migration.indexOf("get_admin_users"));
    expect(insights).toContain("active_users_30d");
    expect(insights).toContain("daily_signups");
    expect(insights).toContain("daily_prayers");
    expect(read("supabase/migrations/202609110001_expand_admin_insights.sql")).toContain("dormant_groups_30d");
    expect(read("supabase/migrations/202609110001_expand_admin_insights.sql")).toContain("successful_challenges");
    expect(read("supabase/migrations/202609110001_expand_admin_insights.sql")).toContain("push_failed_7d");
    expect(insights).not.toContain("prayer.content");
  });

  it("records sensitive member-management actions in a dedicated audit log", () => {
    const migration = read("supabase/migrations/202609090005_admin_center.sql");
    expect(migration).toContain("user.suspended");
    expect(migration).toContain("user.unsuspended");
    expect(migration).toContain("user.signed_out");
    expect(migration).toContain("user.deleted");
  });

  it("only exposes the admin entry point to a super-admin settings bundle", () => {
    const settings = read("app/settings/page.tsx");
    const queries = read("lib/admin-queries.ts");
    expect(settings).toContain("bundle.isSuperAdmin &&");
    expect(settings).toContain('href="/admin/insights"');
    expect(queries).toContain("if (error) return false");
    expect(read("proxy.ts")).toContain('"/admin/:path*"');
  });

  it("requires the target email before a permanent account deletion", () => {
    const page = read("app/admin/users/page.tsx");
    const action = read("app/admin/users/actions.ts");
    expect(page).toContain('name="confirmationEmail"');
    expect(action).toContain("confirmation_email: email.data");
    expect(action).toContain("admin_delete_user");
  });
});
