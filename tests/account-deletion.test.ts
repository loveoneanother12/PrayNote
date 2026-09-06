import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const component = read("components/account-deletion.tsx");
const settingsPage = read("app/settings/page.tsx");
const settingsActions = read("app/settings/actions.ts");
const migration = read("supabase/migrations/202609060004_account_deletion_and_profile_colors.sql");

describe("account deletion", () => {
  it("places a guarded withdrawal flow below logout", () => {
    expect(settingsPage.indexOf("<InstantSignOutButton")).toBeLessThan(settingsPage.indexOf("<AccountDeletion"));
    expect(component).toContain("내 기도 및 그룹에 공유한 기도제목들을 일괄 삭제하시겠습니까?");
    expect(component).toContain("네, 삭제하겠습니다");
    expect(component).toContain('name="withdrawalConfirmed"');
    expect(component).toContain("disabled={pending}");
  });

  it("rechecks authentication and never accepts a user id from the client", () => {
    expect(settingsActions).toContain("await requireUser()");
    expect(settingsActions).toContain('confirmation: "DELETE_MY_ACCOUNT"');
    expect(settingsActions).not.toContain('formData.get("userId")');
    expect(migration).toContain("target_user uuid := auth.uid()");
    expect(migration).toContain("revoke all on function public.delete_my_account(boolean, text) from public, anon");
  });

  it("deletes personal prayers by default and anonymizes retained shared prayers", () => {
    expect(migration).toContain("not exists (\n        select 1 from public.prayer_group_shares");
    expect(migration).toContain("delete from auth.users where id = target_user");
    expect(migration).toContain("on delete set null");
    expect(migration).toContain("when prayer.author_id is null then '(탈퇴한 사용자)'");
  });

  it("transfers led groups or removes groups with no successor", () => {
    expect(migration).toContain("case membership.role when 'admin' then 0 else 1 end");
    expect(migration).toContain("set role = 'leader'");
    expect(migration).toContain("delete from public.groups where id = led_group.group_id");
  });
});
