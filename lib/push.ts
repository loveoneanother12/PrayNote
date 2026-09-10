import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { notificationHref, notificationMessage, type NotificationRow } from "@/lib/notification-queries";
import { quietHoursReleaseAt, type QuietHoursPreference } from "@/lib/push-quiet-hours";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushPreferenceRow = QuietHoursPreference & { push_enabled?: boolean | null };

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Push database configuration is missing");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "https://ourpraynote.vercel.app";
  if (!publicKey || !privateKey) throw new Error("VAPID configuration is missing");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function pushTitle(type: NotificationRow["type"]) {
  switch (type) {
    case "new_prayer": return "새 기도제목이 등록됐어요";
    case "prayer_response": return "함께 기도했어요";
    case "membership_requested": return "새 그룹 가입 신청";
    case "membership_approved": return "그룹 가입이 승인됐어요";
    case "membership_rejected": return "그룹 가입 결과가 도착했어요";
    case "role_changed": return "그룹 역할이 변경됐어요";
    case "group_updated": return "그룹 정보가 변경됐어요";
    case "notice_published": return "새 공지사항이 등록됐어요";
    case "challenge_update": return "기도 챌린지 소식";
  }
}

async function sendToSubscription(
  subscription: PushSubscriptionRow,
  payload: { title: string; body: string; url: string; notificationId: string },
) {
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    { TTL: 60 * 60, urgency: "high" },
  );
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

export async function sendPushForNotification(notificationId: string) {
  configureWebPush();
  const admin = createAdminClient();
  const { data: notification, error } = await admin
    .from("notifications")
    .select("id, recipient_id, actor_id, group_id, prayer_id, type, data, read_at, created_at")
    .eq("id", notificationId)
    .single();

  if (error || !notification) return { delivered: 0, skipped: true };

  const [{ data: preferences }, { data: subscriptions }, { data: actor }, { data: group }, { data: groupPreference }] = await Promise.all([
    admin.from("notification_preferences").select("push_enabled, quiet_hours_enabled, quiet_start, quiet_end").eq("user_id", notification.recipient_id).single(),
    admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", notification.recipient_id),
    notification.actor_id
      ? admin.from("profiles").select("display_name").eq("id", notification.actor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    notification.group_id
      ? admin.from("groups").select("name").eq("id", notification.group_id).maybeSingle()
      : Promise.resolve({ data: null }),
    notification.group_id
      ? admin.from("group_push_preferences").select("push_muted").eq("user_id", notification.recipient_id).eq("group_id", notification.group_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!preferences?.push_enabled || !subscriptions?.length) return { delivered: 0, skipped: true };
  if (groupPreference?.push_muted) return { delivered: 0, skipped: true, reason: "group_muted" };
  if (await deferDuringQuietHours(admin, notification.recipient_id, `notification:${notification.id}`, preferences)) {
    return { delivered: 0, skipped: true, deferred: true };
  }

  const row = notification as NotificationRow;
  const payload = {
    title: pushTitle(row.type),
    body: notificationMessage(row, actor?.display_name ?? null, group?.name ?? null),
    url: notificationHref(row),
    notificationId: row.id,
  };

  let delivered = 0;
  for (const subscription of subscriptions as PushSubscriptionRow[]) {
    const { error: claimError } = await admin.from("push_delivery_attempts").insert({
      notification_id: notificationId,
      subscription_id: subscription.id,
      status: "sending",
    });
    if (claimError?.code === "23505") continue;
    if (claimError) throw claimError;

    try {
      await sendToSubscription(subscription, payload);
      delivered += 1;
      await admin.from("push_delivery_attempts").update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("notification_id", notificationId).eq("subscription_id", subscription.id);
    } catch (sendError) {
      const statusCode = typeof sendError === "object" && sendError && "statusCode" in sendError
        ? Number(sendError.statusCode)
        : null;
      await admin.from("push_delivery_attempts").update({ status: "failed", error_code: statusCode?.toString() ?? "unknown" })
        .eq("notification_id", notificationId).eq("subscription_id", subscription.id);
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }

  return { delivered, skipped: false };
}

export async function sendTestPush(userId: string) {
  configureWebPush();
  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let delivered = 0;
  for (const subscription of (subscriptions ?? []) as PushSubscriptionRow[]) {
    try {
      await sendToSubscription(subscription, {
        title: "PrayNote 알림 준비 완료",
        body: "이 기기에서 새로운 기도 소식을 받을 수 있어요.",
        url: "/notifications",
        notificationId: `test-${Date.now()}`,
      });
      delivered += 1;
    } catch (sendError) {
      const statusCode = typeof sendError === "object" && sendError && "statusCode" in sendError
        ? Number(sendError.statusCode)
        : null;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }
  return { delivered };
}

export async function sendPrayerReminderPush(userId: string, reminderId: string, deliveryDate: string) {
  configureWebPush();
  const admin = createAdminClient();
  const [{ data: preferences }, { data: subscriptions }] = await Promise.all([
    admin.from("notification_preferences").select("push_enabled, quiet_hours_enabled, quiet_start, quiet_end").eq("user_id", userId).single(),
    admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId),
  ]);
  if (!preferences?.push_enabled || !subscriptions?.length) return { delivered: 0, skipped: true };
  if (await deferDuringQuietHours(admin, userId, `reminder:${reminderId}:${deliveryDate}`, preferences)) {
    return { delivered: 0, skipped: true, deferred: true };
  }

  let delivered = 0;
  for (const subscription of subscriptions as PushSubscriptionRow[]) {
    try {
      await sendToSubscription(subscription, {
        title: "기도할 시간입니다.",
        body: "PrayNote에서 오늘의 기도를 이어가세요.",
        url: "/dashboard",
        notificationId: `prayer-reminder-${reminderId}-${deliveryDate}`,
      });
      delivered += 1;
    } catch (sendError) {
      const statusCode = typeof sendError === "object" && sendError && "statusCode" in sendError
        ? Number(sendError.statusCode)
        : null;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }
  return { delivered, skipped: false };
}

export async function dispatchQuietHoursSummaries() {
  configureWebPush();
  const admin = createAdminClient();
  let summaries = 0;
  let delivered = 0;

  for (let index = 0; index < 100; index += 1) {
    const { data, error } = await admin.rpc("claim_due_quiet_push_summary");
    if (error) throw error;
    if (!data) break;
    const summary = data as { user_id: string; release_at: string; notification_count: number };
    summaries += 1;

    const [{ data: preferences }, { data: subscriptions }] = await Promise.all([
      admin.from("notification_preferences").select("push_enabled").eq("user_id", summary.user_id).maybeSingle(),
      admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", summary.user_id),
    ]);

    if (preferences?.push_enabled && subscriptions?.length && summary.notification_count > 0) {
      for (const subscription of subscriptions as PushSubscriptionRow[]) {
        try {
          await sendToSubscription(subscription, {
            title: "방해금지 시간이 끝났어요",
            body: `방해금지 시간동안 ${summary.notification_count}개의 알림이 발생했어요. 확인해보세요.`,
            url: "/notifications",
            notificationId: `quiet-summary-${summary.release_at}`,
          });
          delivered += 1;
        } catch (sendError) {
          const statusCode = typeof sendError === "object" && sendError && "statusCode" in sendError
            ? Number(sendError.statusCode)
            : null;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        }
      }
    }

    await admin.from("deferred_push_events").update({ released_at: new Date().toISOString() })
      .eq("user_id", summary.user_id)
      .eq("release_at", summary.release_at)
      .is("released_at", null);
  }

  return { summaries, delivered };
}
