import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupRole, MembershipStatus } from "@/lib/domain";
import { mapPrayerSummaryRow, type PrayerSummaryRow } from "@/lib/prayer-queries";
import { normalizeProfileColor } from "./profile-colors";

type GroupPageOverviewRow = {
  display_name?: string | null;
  display_profile_color?: string | null;
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

function mapGroupPageOverview(row: GroupPageOverviewRow) {
  return {
    displayName: row.display_name ?? null,
    profileColor: normalizeProfileColor(row.display_profile_color),
    role: row.role,
    group: row.group,
    memberCount: Number(row.member_count),
    myGroups: row.my_groups ?? [],
  };
}

export async function getGroupPageOverview(supabase: SupabaseClient, groupId: string) {
  const { data, error } = await supabase.rpc("get_group_page_overview", { target_group_id: groupId });
  if (error) throw error;
  if (!data) return null;

  const row = data as GroupPageOverviewRow;
  return mapGroupPageOverview(row);
}

export async function getGroupPageBundle(supabase: SupabaseClient, groupId: string) {
  const { data, error } = await supabase.rpc("get_group_page_bundle_fast", { target_group_id: groupId });
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    user_id: string;
    email?: string | null;
    overview?: GroupPageOverviewRow | null;
    prayers?: PrayerSummaryRow[];
  };
  return { userId: row.user_id, email: row.email ?? "", overview: row.overview ? mapGroupPageOverview(row.overview) : null, prayers: (row.prayers ?? []).map(mapPrayerSummaryRow) };
}

type GroupManageOverviewRow = {
  display_name?: string | null;
  display_profile_color?: string | null;
  role: GroupRole;
  group: { id: string; name: string; description: string | null };
  memberships?: Array<{
    id: string;
    user_id: string;
    display_name: string;
    profile_color?: string | null;
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
    profileColor: normalizeProfileColor(row.display_profile_color),
    role: row.role,
    group: row.group,
    memberships: (row.memberships ?? []).map((membership) => ({ ...membership, profile_color: normalizeProfileColor(membership.profile_color) })),
  };
}

export async function getGroupManageBundle(supabase: SupabaseClient, groupId: string) {
  const { data, error } = await supabase.rpc("get_group_manage_bundle_fast", { target_group_id: groupId });
  if (error) throw error;
  if (!data) return null;
  const row = data as { user_id: string; email?: string | null; overview?: GroupManageOverviewRow | null };
  return {
    userId: row.user_id,
    email: row.email ?? "",
    overview: row.overview ? {
      displayName: row.overview.display_name ?? null,
      profileColor: normalizeProfileColor(row.overview.display_profile_color),
      role: row.overview.role,
      group: row.overview.group,
      memberships: (row.overview.memberships ?? []).map((membership) => ({ ...membership, profile_color: normalizeProfileColor(membership.profile_color) })),
    } : null,
  };
}
