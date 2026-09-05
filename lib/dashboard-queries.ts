import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupRole, GroupSummary, NotificationSummary, PrayerSummary, ProfileColor } from "@/lib/domain";
import { mapNotificationSummaryRow, type NotificationSummaryRow } from "@/lib/notification-queries";
import { mapPrayerSummaryRow, type PrayerSummaryRow } from "@/lib/prayer-queries";
import { normalizeProfileColor } from "./profile-colors";

type DashboardOverviewRow = {
  display_name?: string | null;
  profile_color?: string | null;
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
  profileColor: ProfileColor;
  groups: GroupSummary[];
  unreadCount: number;
};

export type DashboardBundle = DashboardOverview & {
  userId: string;
  email: string;
  groupCount: number;
  prayerCount: number;
  groupPrayers: PrayerSummary[];
  personalPrayers: PrayerSummary[];
  notifications: NotificationSummary[];
};

export async function getDashboardOverview(supabase: SupabaseClient): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc("get_dashboard_overview");
  if (error) throw error;

  const row = (data ?? {}) as DashboardOverviewRow;
  return {
    displayName: row.display_name ?? null,
    profileColor: normalizeProfileColor(row.profile_color),
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

export async function getDashboardBundle(supabase: SupabaseClient): Promise<DashboardBundle | null> {
  const { data, error } = await supabase.rpc("get_dashboard_bundle_fast");
  if (error) throw error;
  if (!data) return null;
  const bundle = data as {
    user_id: string;
    email?: string | null;
    overview: DashboardOverviewRow;
    counts?: { group_count?: number | string | null; prayer_count?: number | string | null };
    group_prayers?: PrayerSummaryRow[];
    personal_prayers?: PrayerSummaryRow[];
    notifications?: NotificationSummaryRow[];
  };
  const overview = bundle.overview ?? {};
  const groupPrayers = (bundle.group_prayers ?? []).map(mapPrayerSummaryRow);
  const personalPrayers = (bundle.personal_prayers ?? []).map(mapPrayerSummaryRow);
  return {
    userId: bundle.user_id,
    email: bundle.email ?? "",
    displayName: overview.display_name ?? null,
    profileColor: normalizeProfileColor(overview.profile_color),
    unreadCount: Number(overview.unread_count ?? 0),
    groups: (overview.groups ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      role: group.role,
      memberCount: Number(group.member_count),
      unreadCount: Number(group.unread_count),
    })),
    groupCount: Number(bundle.counts?.group_count ?? overview.groups?.length ?? 0),
    prayerCount: Number(bundle.counts?.prayer_count ?? new Set([...groupPrayers, ...personalPrayers].map((prayer) => prayer.id)).size),
    groupPrayers,
    personalPrayers,
    notifications: (bundle.notifications ?? []).map(mapNotificationSummaryRow),
  };
}
