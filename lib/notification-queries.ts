import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationSummary, NotificationType } from "@/lib/domain";
import { normalizeProfileColor } from "./profile-colors";

export type NotificationRow = {
  id: string;
  actor_id: string | null;
  group_id: string | null;
  prayer_id: string | null;
  type: NotificationType;
  data: unknown;
  read_at: string | null;
  created_at: string;
};

export type NotificationSummaryRow = NotificationRow & {
  actor_name: string | null;
  group_name: string | null;
};

export function mapNotificationSummaryRow(row: NotificationSummaryRow): NotificationSummary {
  return {
    id: row.id,
    type: row.type,
    message: notificationMessage(row, row.actor_name, row.group_name),
    groupName: row.group_name,
    href: notificationHref(row),
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export async function getNotificationsPageBundle(supabase: SupabaseClient, limit = 100) {
  const { data, error } = await supabase.rpc("get_notifications_page_bundle_fast", { result_limit: limit });
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    user_id: string;
    email?: string | null;
    display_name?: string | null;
    profile_color?: string | null;
    notifications?: NotificationSummaryRow[];
  };
  return {
    userId: row.user_id,
    email: row.email ?? "",
    displayName: row.display_name ?? null,
    profileColor: normalizeProfileColor(row.profile_color),
    notifications: (row.notifications ?? []).map(mapNotificationSummaryRow),
  };
}

function roleFrom(data: unknown) {
  if (!data || typeof data !== "object" || !("role" in data)) return null;
  const role = (data as { role?: unknown }).role;
  return role === "admin" || role === "member" ? role : null;
}

export function notificationMessage(row: NotificationRow, actorName: string | null, groupName: string | null) {
  const actor = actorName ? `${actorName}님이` : "누군가가";
  const group = groupName ? `‘${groupName}’` : "그룹";

  switch (row.type) {
    case "new_prayer":
      return `${actor} ${group}에 새 기도제목을 나눴어요.`;
    case "prayer_response":
      return `${actor} 오늘 내 기도제목을 위해 기도했어요.`;
    case "membership_requested":
      return `${actor} ${group} 가입을 신청했어요.`;
    case "membership_approved":
      return `${group} 가입 신청이 승인됐어요.`;
    case "membership_rejected":
      return `${group} 가입 신청이 승인되지 않았어요.`;
    case "role_changed":
      return roleFrom(row.data) === "admin"
        ? `${group}의 Admin 권한이 부여됐어요.`
        : `${group}의 역할이 Member로 변경됐어요.`;
    case "group_updated":
      return `${group} 정보가 변경됐어요.`;
  }
}

export function notificationHref(row: NotificationRow) {
  if (row.type === "membership_requested" && row.group_id) return `/groups/${row.group_id}/manage`;
  if (row.type === "membership_rejected" && row.group_id) return `/join/${row.group_id}`;
  if (row.prayer_id) return `/prayers/${row.prayer_id}`;
  if (row.group_id) return `/groups/${row.group_id}`;
  return "/notifications";
}

export async function getNotificationSummaries(
  supabase: SupabaseClient,
  _recipientId: string,
  limit = 50,
): Promise<NotificationSummary[]> {
  const { data, error } = await supabase.rpc("get_notification_summaries_fast", { result_limit: limit });

  if (error) {
    console.error("Failed to fetch notifications", { code: error.code, message: error.message });
    return [];
  }

  const rows = (data ?? []) as NotificationSummaryRow[];

  return rows.map(mapNotificationSummaryRow);
}
