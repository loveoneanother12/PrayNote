import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProfileColor } from "@/lib/profile-colors";
import type { ProfileColor } from "@/lib/domain";

export type AdminMetricSeries = Array<{ date: string; count: number }>;

export type AdminInsights = {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsers30d: number;
  suspendedUsers: number;
  totalGroups: number;
  activeGroups30d: number;
  totalPrayers: number;
  personalPrayers: number;
  groupPrayers: number;
  prayersCompletedToday: number;
  pushEnabledUsers: number;
  dailySignups: AdminMetricSeries;
  dailyPrayers: AdminMetricSeries;
};

export type AdminUser = {
  userId: string;
  email: string;
  displayName: string;
  profileColor: ProfileColor;
  createdAt: string;
  lastSignInAt: string | null;
  lastActivityAt: string | null;
  bannedUntil: string | null;
  isSuspended: boolean;
  providers: string[];
  isSuperAdmin: boolean;
  groupCount: number;
  prayerCount: number;
  prayerResponseCount: number;
};

export type AdminActionLog = {
  id: string;
  targetUserId: string | null;
  targetEmail: string | null;
  action: "user.suspended" | "user.unsuspended" | "user.signed_out" | "user.deleted";
  metadata: Record<string, unknown>;
  createdAt: string;
  actorName: string;
};

const count = (value: unknown) => Number(value ?? 0);
const series = (value: unknown): AdminMetricSeries => Array.isArray(value)
  ? value.map((item) => ({ date: String(item?.date ?? ""), count: count(item?.count) }))
  : [];

export async function isSuperAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) return false;
  return data === true;
}

export async function getAdminInsights(supabase: SupabaseClient): Promise<AdminInsights> {
  const { data, error } = await supabase.rpc("get_admin_insights");
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    totalUsers: count(row.total_users),
    newUsersToday: count(row.new_users_today),
    newUsers7d: count(row.new_users_7d),
    newUsers30d: count(row.new_users_30d),
    activeUsers30d: count(row.active_users_30d),
    suspendedUsers: count(row.suspended_users),
    totalGroups: count(row.total_groups),
    activeGroups30d: count(row.active_groups_30d),
    totalPrayers: count(row.total_prayers),
    personalPrayers: count(row.personal_prayers),
    groupPrayers: count(row.group_prayers),
    prayersCompletedToday: count(row.prayers_completed_today),
    pushEnabledUsers: count(row.push_enabled_users),
    dailySignups: series(row.daily_signups),
    dailyPrayers: series(row.daily_prayers),
  };
}

export async function getAdminUsers(supabase: SupabaseClient, search: string, page: number) {
  const pageSize = 30;
  const { data, error } = await supabase.rpc("get_admin_users", {
    search_term: search || null,
    page_size: pageSize,
    page_offset: Math.max(page - 1, 0) * pageSize,
  });
  if (error) throw error;
  const bundle = (data ?? {}) as { total?: number | string; users?: Array<Record<string, unknown>> };
  const users: AdminUser[] = (bundle.users ?? []).map((row) => ({
    userId: String(row.user_id),
    email: String(row.email ?? ""),
    displayName: String(row.display_name ?? "알 수 없는 회원"),
    profileColor: normalizeProfileColor(String(row.profile_color ?? "indigo")),
    createdAt: String(row.created_at),
    lastSignInAt: row.last_sign_in_at ? String(row.last_sign_in_at) : null,
    lastActivityAt: row.last_activity_at ? String(row.last_activity_at) : null,
    bannedUntil: row.banned_until ? String(row.banned_until) : null,
    isSuspended: row.is_suspended === true,
    providers: Array.isArray(row.providers) ? row.providers.map(String) : [],
    isSuperAdmin: row.is_super_admin === true,
    groupCount: count(row.group_count),
    prayerCount: count(row.prayer_count),
    prayerResponseCount: count(row.prayer_response_count),
  }));
  return { users, total: count(bundle.total), pageSize };
}

export async function getAdminActionLogs(supabase: SupabaseClient, limit = 30): Promise<AdminActionLog[]> {
  const { data, error } = await supabase.rpc("get_admin_action_logs", { result_limit: limit });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    targetUserId: row.target_user_id ? String(row.target_user_id) : null,
    targetEmail: row.target_email ? String(row.target_email) : null,
    action: row.action as AdminActionLog["action"],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    actorName: String(row.actor_name ?? "관리자"),
  }));
}
