import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupRole, GroupSummary } from "@/lib/domain";

type DashboardOverviewRow = {
  display_name?: string | null;
  unread_count?: number | string | null;
  groups?: Array<{
    id: string;
    name: string;
    description: string | null;
    role: GroupRole;
    member_count: number | string;
    unread_count: number | string;
  }>;
};

export type DashboardOverview = {
  displayName: string | null;
  groups: GroupSummary[];
  unreadCount: number;
};

export async function getDashboardOverview(supabase: SupabaseClient): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc("get_dashboard_overview");
  if (error) throw error;

  const row = (data ?? {}) as DashboardOverviewRow;
  return {
    displayName: row.display_name ?? null,
    unreadCount: Number(row.unread_count ?? 0),
    groups: (row.groups ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      role: group.role,
      memberCount: Number(group.member_count),
      unreadCount: Number(group.unread_count),
    })),
  };
}
