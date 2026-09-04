import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupRole, MembershipStatus } from "@/lib/domain";

type GroupPageOverviewRow = {
  display_name?: string | null;
  role: GroupRole;
  group: {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
  };
  member_count: number | string;
  my_groups?: Array<{ id: string; name: string }>;
};

export async function getGroupPageOverview(supabase: SupabaseClient, groupId: string) {
  const { data, error } = await supabase.rpc("get_group_page_overview", { target_group_id: groupId });
  if (error) throw error;
  if (!data) return null;

  const row = data as GroupPageOverviewRow;
  return {
    displayName: row.display_name ?? null,
    role: row.role,
    group: row.group,
    memberCount: Number(row.member_count),
    myGroups: row.my_groups ?? [],
  };
}

type GroupManageOverviewRow = {
  display_name?: string | null;
  role: GroupRole;
  group: { id: string; name: string; description: string | null };
  memberships?: Array<{
    id: string;
    user_id: string;
    display_name: string;
    role: GroupRole;
    status: MembershipStatus;
    requested_at: string;
  }>;
};

export async function getGroupManageOverview(supabase: SupabaseClient, groupId: string) {
  const { data, error } = await supabase.rpc("get_group_manage_overview", { target_group_id: groupId });
  if (error) throw error;
  if (!data) return null;

  const row = data as GroupManageOverviewRow;
  return {
    displayName: row.display_name ?? null,
    role: row.role,
    group: row.group,
    memberships: row.memberships ?? [],
  };
}
