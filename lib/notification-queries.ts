import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationSummary, NotificationType } from "@/lib/domain";

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
  recipientId: string,
  limit = 50,
): Promise<NotificationSummary[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, actor_id, group_id, prayer_id, type, data, read_at, created_at")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications", { code: error.code, message: error.message });
    return [];
  }

  const rows = (data ?? []) as NotificationRow[];
  const actorIds = [...new Set(rows.flatMap((row) => (row.actor_id ? [row.actor_id] : [])))];
  const groupIds = [...new Set(rows.flatMap((row) => (row.group_id ? [row.group_id] : [])))];
  const [{ data: profiles }, { data: groups }] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", actorIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabase.from("groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
  ]);

  return rows.map((row) => {
    const actorName = profiles?.find((profile) => profile.id === row.actor_id)?.display_name ?? null;
    const groupName = groups?.find((group) => group.id === row.group_id)?.name ?? null;
    return {
      id: row.id,
      type: row.type,
      message: notificationMessage(row, actorName, groupName),
      groupName,
      href: notificationHref(row),
      createdAt: row.created_at,
      readAt: row.read_at,
    };
  });
}
