import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("dashboard, notices, and prayer trash", () => {
  it("keeps dashboard previews to three prayers and supports scoped/all views", () => {
    const dashboard = read("components/praynote-app.tsx");
    expect(dashboard).toContain("groupPrayers = allGroupPrayers.slice(0, 3)");
    expect(dashboard).toContain("personalPrayers.slice(0, 3)");
    expect(dashboard).toContain("대시보드 미리보기에 띄울 그룹 선택");
    expect(dashboard).toContain("모든 기도제목/그룹 보기");
    expect(dashboard).toContain('"personal"');
  });

  it("returns new invitees to the invite after opening signup first", () => {
    const invite = read("app/join/[groupId]/page.tsx");
    const signup = read("app/login/actions.ts");
    const proxy = read("proxy.ts");
    expect(invite.indexOf("supabase.auth.getUser()")).toBeLessThan(invite.indexOf('supabase.rpc("get_join_page_bundle_fast"'));
    expect(invite).toContain("/login?mode=signup&next=");
    expect(signup).toContain("redirect(onboardingDashboardPath(next))");
    expect(proxy).toContain('request.nextUrl.pathname.startsWith("/join/")');
    expect(proxy).toContain("return NextResponse.redirect(loginUrl)");
  });

  it("adds notice preferences and creates one notification per profile", () => {
    const migration = read("supabase/migrations/202609090002_notice_preferences_and_prayer_trash.sql");
    const settings = read("app/settings/page.tsx");
    expect(migration).toContain("notice_enabled boolean not null default true");
    expect(migration).toContain("from public.profiles profile");
    expect(migration).toContain("notice_published");
    expect(settings).toContain("공지사항 알림");
  });

  it("keeps deleted prayers in a private trash until restore or permanent deletion", () => {
    const migration = read("supabase/migrations/202609090002_notice_preferences_and_prayer_trash.sql");
    const trash = read("components/prayer-trash.tsx");
    expect(migration).toContain("prayer.author_id = auth.uid() and prayer.deleted_at is not null");
    expect(migration).toContain("restore_prayers_from_trash");
    expect(migration).toContain("permanently_delete_prayers");
    expect(trash).toContain("복원");
    expect(trash).toContain("완전 삭제");
  });

  it("offers mobile search, a password dialog, and explicit push ON/OFF", () => {
    expect(read("components/mobile-prayer-search.tsx")).toContain("기도제목 검색");
    expect(read("components/instant-settings-forms.tsx")).toContain("password-change-modal");
    const push = read("components/browser-push-settings.tsx");
    expect(push).toContain('state === "on" ? "ON" : "OFF"');
    expect(push).toContain("sendTest");
  });
});
