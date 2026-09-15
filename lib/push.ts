import { createClient } from "@supabase/supabase-js";
import { notificationHref, type NotificationRow } from "@/lib/notification-queries";
import {
  FirebasePushProvider,
  type NativePushTarget,
  type PushEnvelope,
  WebPushProvider,
  type WebPushTarget,
} from "@/lib/push-providers";
import { quietHoursReleaseAt, type QuietHoursPreference } from "@/lib/push-quiet-hours";

type PushPreferenceRow = QuietHoursPreference & { push_enabled?: boolean | null };

const webProvider = new WebPushProvider();
const nativeProvider = new FirebasePushProvider();

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Push database configuration is missing");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isMissingOutboxRpc(error: { code?: string } | null) {
  return error?.code === "PGRST202" || error?.code === "42883";
}

export async function claimPushOutbox(notificationId: string) {
  const { data, error } = await createAdminClient().rpc("claim_push_outbox", {
    target_notification_id: notificationId,
  });
  if (isMissingOutboxRpc(error)) return true;
  if (error) throw error;
  return data === true;
}

export async function completePushOutbox(notificationId: string) {
  const { error } = await createAdminClient().rpc("complete_push_outbox", {
    target_notification_id: notificationId,
  });
  if (isMissingOutboxRpc(error)) return;
  if (error) throw error;
}

export async function failPushOutbox(notificationId: string, errorCode: string) {
  const { error } = await createAdminClient().rpc("fail_push_outbox", {
    target_notification_id: notificationId,
    failure_code: errorCode,
  });
  if (isMissingOutboxRpc(error)) return;
  if (error) console.error("Unable to release push outbox item", error.code);
}

function pushCopy(type: NotificationRow["type"]): Pick<PushEnvelope, "title" | "body"> {
  switch (type) {
    case "new_prayer": return { title: "새 기도제목이 등록됐어요", body: "가입한 그룹에 새로운 기도제목이 도착했어요." };
    case "prayer_response": return { title: "함께 기도했어요", body: "누군가 회원님의 기도제목을 위해 기도했어요." };
    case "membership_requested": return { title: "새 그룹 가입 신청", body: "새로운 그룹 가입 신청을 확인해주세요." };
    case "membership_approved": return { title: "그룹 가입이 승인됐어요", body: "PrayNote에서 새로운 그룹을 확인해보세요." };
    case "membership_rejected": return { title: "그룹 가입 결과가 도착했어요", body: "PrayNote에서 가입 결과를 확인해주세요." };
    case "role_changed": return { title: "그룹 역할이 변경됐어요", body: "그룹에서 변경된 역할을 확인해주세요." };
    case "group_updated": return { title: "그룹 정보가 변경됐어요", body: "가입한 그룹에 새로운 변경사항이 있어요." };
    case "notice_published": return { title: "새 공지사항이 등록됐어요", body: "PrayNote에서 새로운 공지사항을 확인해주세요." };
    case "challenge_update": return { title: "기도 챌린지 소식", body: "참여 중인 기도 챌린지에 새로운 소식이 있어요." };
  }
}

async function deferDuringQuietHours(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  eventKey: string,
  preferences: PushPreferenceRow | null,
) {
  const releaseAt = quietHoursReleaseAt(preferences);
  if (!releaseAt) return false;
  const { error } = await admin.from("deferred_push_events").upsert({
    user_id: userId,
    event_key: eventKey,
    release_at: releaseAt.toISOString(),
  }, { onConflict: "event_key", ignoreDuplicates: true });
  if (error) throw error;
  return true;
}

async function webTargetsFor(admin: ReturnType<typeof createAdminClient>, userId: string, notificationId?: string) {
  const [{ data: subscriptions }, { data: delivered }] = await Promise.all([
    admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId),
    notificationId
      ? admin.from("push_delivery_attempts").select("subscription_id").eq("notification_id", notificationId).eq("status", "delivered")
      : Promise.resolve({ data: [] }),
  ]);
  const deliveredIds = new Set((delivered ?? []).map((row) => row.subscription_id as string));
  return ((subscriptions ?? []) as WebPushTarget[]).filter((target) => !deliveredIds.has(target.id));
}

async function nativeTargetsFor(admin: ReturnType<typeof createAdminClient>, userId: string, notificationId?: string) {
  const [{ data: tokens }, { data: delivered }] = await Promise.all([
    admin.from("native_push_tokens").select("id, token, platform").eq("user_id", userId).eq("provider", "fcm"),
    notificationId
      ? admin.from("native_push_delivery_attempts").select("token_id").eq("notification_id", notificationId).eq("status", "delivered")
      : Promise.resolve({ data: [] }),
  ]);
  const deliveredIds = new Set((delivered ?? []).map((row) => row.token_id as string));
  return ((tokens ?? []) as NativePushTarget[]).filter((target) => !deliveredIds.has(target.id));
}

async function deliver(admin: ReturnType<typeof createAdminClient>, userId: string, message: PushEnvelope, notificationId?: string) {
  const [webTargets, nativeTargets] = await Promise.all([
    webProvider.isConfigured() ? webTargetsFor(admin, userId, notificationId) : Promise.resolve([]),
    nativeProvider.isConfigured() ? nativeTargetsFor(admin, userId, notificationId) : Promise.resolve([]),
  ]);
  const [webResults, nativeResults] = await Promise.all([
    webProvider.send(webTargets, message),
    nativeProvider.send(nativeTargets, message),
  ]);

  let webDelivered = 0;
  let retryableFailures = 0;
  for (const target of webTargets) {
    const result = webResults.get(target.id);
    if (!result) {
      retryableFailures += 1;
      continue;
    }
    if (notificationId) {
      await admin.from("push_delivery_attempts").upsert({
        notification_id: notificationId,
        subscription_id: target.id,
        status: result.delivered ? "delivered" : "failed",
        error_code: result.errorCode ?? null,
        attempted_at: new Date().toISOString(),
        delivered_at: result.delivered ? new Date().toISOString() : null,
      });
    }
    if (result.delivered) webDelivered += 1;
    if (!result.delivered && !result.permanentFailure) retryableFailures += 1;
    if (result.permanentFailure) await admin.from("push_subscriptions").delete().eq("id", target.id);
  }

  let nativeDelivered = 0;
  for (const target of nativeTargets) {
    const result = nativeResults.get(target.id);
    if (!result) {
      retryableFailures += 1;
      continue;
    }
    if (notificationId) {
      await admin.from("native_push_delivery_attempts").upsert({
        notification_id: notificationId,
        token_id: target.id,
        status: result.delivered ? "delivered" : "failed",
        error_code: result.errorCode ?? null,
        attempted_at: new Date().toISOString(),
        delivered_at: result.delivered ? new Date().toISOString() : null,
      });
    }
    if (result.delivered) nativeDelivered += 1;
    if (!result.delivered && !result.permanentFailure) retryableFailures += 1;
    if (result.permanentFailure) await admin.from("native_push_tokens").delete().eq("id", target.id);
  }
  return {
    delivered: webDelivered + nativeDelivered,
    webDelivered,
    nativeDelivered,
    retryableFailures,
  };
}

export async function sendPushForNotification(notificationId: string) {
  const admin = createAdminClient();
  const { data: notification, error } = await admin.from("notifications")
    .select("id, recipient_id, actor_id, group_id, prayer_id, type, data, read_at, created_at")
    .eq("id", notificationId).single();
  if (error || !notification) return { delivered: 0, skipped: true };

  const [{ data: preferences }, { data: groupPreference }] = await Promise.all([
    admin.from("notification_preferences").select("push_enabled, quiet_hours_enabled, quiet_start, quiet_end").eq("user_id", notification.recipient_id).single(),
    notification.group_id
      ? admin.from("group_push_preferences").select("push_muted").eq("user_id", notification.recipient_id).eq("group_id", notification.group_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!preferences?.push_enabled) return { delivered: 0, skipped: true, reason: "push_disabled" };
  if (groupPreference?.push_muted) return { delivered: 0, skipped: true, reason: "group_muted" };
  if (await deferDuringQuietHours(admin, notification.recipient_id, `notification:${notification.id}`, preferences)) {
    return { delivered: 0, skipped: true, deferred: true };
  }

  const row = notification as NotificationRow;
  const result = await deliver(admin, notification.recipient_id, {
    ...pushCopy(row.type),
    url: notificationHref(row),
    notificationId: row.id,
    type: row.type,
    groupId: row.group_id,
  }, notificationId);
  if (result.retryableFailures > 0) {
    throw new Error("RetryablePushDeliveryFailure");
  }
  return { ...result, skipped: false };
}

export async function sendTestPush(userId: string) {
  const admin = createAdminClient();
  return deliver(admin, userId, {
    title: "PrayNote 알림 준비 완료",
    body: "이 기기에서 새로운 기도 소식을 받을 수 있어요.",
    url: "/notifications",
    notificationId: `test-${Date.now()}`,
    type: "test",
  });
}

export async function sendPrayerReminderPush(userId: string, reminderId: string, deliveryDate: string) {
  const admin = createAdminClient();
  const { data: preferences } = await admin.from("notification_preferences")
    .select("push_enabled, quiet_hours_enabled, quiet_start, quiet_end").eq("user_id", userId).single();
  if (!preferences?.push_enabled) return { delivered: 0, skipped: true };
  if (await deferDuringQuietHours(admin, userId, `reminder:${reminderId}:${deliveryDate}`, preferences)) {
    return { delivered: 0, skipped: true, deferred: true };
  }
  const result = await deliver(admin, userId, {
    title: "기도할 시간입니다",
    body: "PrayNote에서 오늘의 기도를 이어가세요.",
    url: "/dashboard",
    notificationId: `prayer-reminder-${reminderId}-${deliveryDate}`,
    type: "prayer_reminder",
  });
  return { ...result, skipped: false };
}

export async function dispatchQuietHoursSummaries() {
  const admin = createAdminClient();
  let summaries = 0;
  let delivered = 0;
  for (let index = 0; index < 100; index += 1) {
    const { data, error } = await admin.rpc("claim_due_quiet_push_summary");
    if (error) throw error;
    if (!data) break;
    const summary = data as { user_id: string; release_at: string; notification_count: number };
    summaries += 1;
    const { data: preferences } = await admin.from("notification_preferences").select("push_enabled").eq("user_id", summary.user_id).maybeSingle();
    if (preferences?.push_enabled && summary.notification_count > 0) {
      const result = await deliver(admin, summary.user_id, {
        title: "방해금지 시간이 끝났어요",
        body: `방해금지 시간 동안 ${summary.notification_count}개의 알림이 발생했어요. 확인해보세요.`,
        url: "/notifications",
        notificationId: `quiet-summary-${summary.release_at}`,
        type: "quiet_summary",
      });
      delivered += result.delivered;
    }
    await admin.from("deferred_push_events").update({ released_at: new Date().toISOString() })
      .eq("user_id", summary.user_id).eq("release_at", summary.release_at).is("released_at", null);
  }
  return { summaries, delivered };
}
