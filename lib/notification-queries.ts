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

function noticeTitleFrom(data: unknown) {
  if (!data || typeof data !== "object" || !("title" in data)) return null;
  const title = (data as { title?: unknown }).title;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

function challengeData(data: unknown) {
  if (!data || typeof data !== "object") return { event: null, title: null };
  const value = data as { challenge_event?: unknown; challenge_title?: unknown };
  return {
    event: typeof value.challenge_event === "string" ? value.challenge_event : null,
    title: typeof value.challenge_title === "string" ? value.challenge_title : null,
  };
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
    case "notice_published":
      return noticeTitleFrom(row.data) ? `새 공지 ‘${noticeTitleFrom(row.data)}’가 등록됐어요.` : "새 공지사항이 등록됐어요.";
    case "challenge_update": {
      const challenge = challengeData(row.data);
      if (challenge.event === "daily_reminder") return "오늘도 공동체의 기도를 이어가 볼까요?";
      if (challenge.event === "last_day") return "기도 챌린지가 하루 남았어요.";
      if (challenge.event === "completed") return "함께 기도를 이어 챌린지를 완주했어요.";
      if (challenge.event === "ended") return "기도 챌린지가 종료됐어요. 함께한 기록을 확인해보세요.";
      if (challenge.event === "stopped") return "기도 챌린지가 중단되어 지금까지의 기록을 보관했어요.";
      if (challenge.event === "started") return "기도 챌린지가 시작됐어요.";
      return challenge.title ? `새 기도 챌린지 ‘${challenge.title}’가 열렸어요.` : "새로운 기도 챌린지가 열렸어요.";
    }
  }
}

export function notificationHref(row: NotificationRow) {
  if (row.type === "membership_requested" && row.group_id) return `/groups/${row.group_id}/manage`;
  if (row.type === "membership_rejected" && row.group_id) return `/join/${row.group_id}`;
  if (row.type === "notice_published") return "/notices";
  if (row.type === "challenge_update" && row.group_id) return `/groups/${row.group_id}#group-challenge-title`;
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
