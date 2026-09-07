import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("compact selectors", () => {
  it("keeps the prayer group list collapsed behind an accessible trigger", () => {
    const composer = read("components/dashboard-prayer-composer.tsx");
    expect(composer).toContain("그룹 선택하기");
    expect(composer).toContain('aria-expanded={groupsOpen}');
    expect(composer).toContain('id="composer-group-options"');
    expect(composer).toContain("composer-group-collapse");
  });

  it("opens profile colors in a body-level dialog", () => {
    const settingsForms = read("components/instant-settings-forms.tsx");
    expect(settingsForms).toContain("createPortal(");
    expect(settingsForms).toContain("color-picker-modal");
    expect(settingsForms).toContain("document.body");
    expect(settingsForms).toContain('role="radiogroup"');
  });
});

describe("notice board authorization", () => {
  const migration = read("supabase/migrations/202609070002_notices_and_color_palette.sql");
  const page = read("app/notices/page.tsx");
  const actions = read("app/notices/actions.ts");

  it("shows notice composition only to database-designated super admins", () => {
    expect(page).toContain("{bundle.isSuperAdmin && (");
    expect(page).toContain("공지사항 작성");
    expect(migration).toContain("create table if not exists public.super_admins");
    expect(migration).toContain("create or replace function public.is_super_admin()");
  });

  it("enforces write permissions in both actions and row-level security", () => {
    expect(actions).toContain('await supabase.rpc("is_super_admin")');
    expect(migration).toContain("notices_insert_super_admin");
    expect(migration).toContain("notices_update_super_admin");
    expect(migration).toContain("notices_delete_super_admin");
    expect(migration).toContain("revoke all on table public.super_admins from anon, authenticated");
  });

  it("links the board directly below the profile panel", () => {
    const settings = read("app/settings/page.tsx");
    expect(settings).toContain('className="settings-notice-link" href="/notices"');
    expect(settings.indexOf("<GoogleIdentitySettings")).toBeLessThan(settings.indexOf("settings-notice-link"));
  });
});
