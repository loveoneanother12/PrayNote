import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202609140002_group_leadership_transfer.sql", "utf8");
const page = readFileSync("app/groups/[groupId]/manage/page.tsx", "utf8");
const menu = readFileSync("components/member-management-menu.tsx", "utf8");

describe("leader-only member management", () => {
  it("transfers leadership atomically and retains the previous leader as admin", () => {
    expect(migration).toContain("transfer_group_leadership");
    expect(migration).toContain("for update");
    expect(migration).toContain("then 'admin'::public.group_role");
    expect(migration).toContain("then 'leader'::public.group_role");
    expect(migration).toContain("set created_by = target_user_id");
  });

  it("restricts removal to leaders and protects the current leader", () => {
    expect(migration).toContain("leader_permission_required");
    expect(migration).toContain("cannot_remove_self");
    expect(migration).toContain("cannot_remove_leader");
    expect(migration).toContain("grant execute on function public.remove_group_member(uuid, uuid) to authenticated");
  });

  it("shows the three requested actions only in the leader controls", () => {
    expect(page).toContain("isLeader && membership.user_id !== bundle.userId");
    expect(page).toContain("MemberManagementMenu");
    expect(menu).toContain("Admin 설정/해제");
    expect(menu).toContain("리더 권한 위임");
    expect(menu).toContain("그룹 탈퇴");
    expect(menu).toContain('role="menu"');
  });
});
