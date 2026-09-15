import { GoogleAuth } from "google-auth-library";
import webpush from "web-push";

export type PushEnvelope = {
  title: string;
  body: string;
  url: string;
  notificationId: string;
  type?: string;
  groupId?: string | null;
};

export type PushDeliveryResult = {
  delivered: boolean;
  permanentFailure: boolean;
  errorCode?: string;
};

export type WebPushTarget = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type NativePushTarget = {
  id: string;
  token: string;
  platform: "ios" | "android";
};

export interface PushProvider<TTarget> {
  readonly name: "web_push" | "firebase";
  isConfigured(): boolean;
  send(targets: TTarget[], message: PushEnvelope): Promise<Map<string, PushDeliveryResult>>;
}

export class WebPushProvider implements PushProvider<WebPushTarget> {
  readonly name = "web_push" as const;

  isConfigured() {
    return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }

  async send(targets: WebPushTarget[], message: PushEnvelope) {
    const results = new Map<string, PushDeliveryResult>();
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return results;

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "https://praynote.app",
      publicKey,
      privateKey,
    );

    await Promise.all(targets.map(async (target) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          JSON.stringify(message),
          { TTL: 60 * 60, urgency: "high" },
        );
        results.set(target.id, { delivered: true, permanentFailure: false });
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : null;
        results.set(target.id, {
          delivered: false,
          permanentFailure: statusCode === 404 || statusCode === 410,
          errorCode: statusCode?.toString() ?? "web_push_error",
        });
      }
    }));

    return results;
  }
}

function firebasePrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export class FirebasePushProvider implements PushProvider<NativePushTarget> {
  readonly name = "firebase" as const;

  isConfigured() {
    return Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      firebasePrivateKey(),
    );
  }

  private auth() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = firebasePrivateKey();
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase push credentials are missing");
    }
    return new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
  }

  async send(targets: NativePushTarget[], message: PushEnvelope) {
    const results = new Map<string, PushDeliveryResult>();
    if (!targets.length || !this.isConfigured()) return results;

    const projectId = process.env.FIREBASE_PROJECT_ID!;
    const client = await this.auth().getClient();
    const accessToken = await client.getAccessToken();
    if (!accessToken.token) throw new Error("Unable to authorize Firebase messaging");

    for (let start = 0; start < targets.length; start += 20) {
      const batch = targets.slice(start, start + 20);
      await Promise.all(batch.map(async (target) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: target.token,
                notification: { title: message.title, body: message.body },
                data: {
                  notification_id: message.notificationId,
                  route: message.url,
                  type: message.type ?? "notification",
                  ...(message.groupId ? { group_id: message.groupId } : {}),
                },
                android: {
                  priority: "HIGH",
                  notification: { channel_id: "praynote_activity", sound: "default" },
                },
                apns: {
                  headers: { "apns-priority": "10" },
                  payload: { aps: { sound: "default" } },
                },
              },
            }),
          },
        );
        if (response.ok) {
          results.set(target.id, { delivered: true, permanentFailure: false });
          return;
        }
        const payload = await response.json().catch(() => null) as {
          error?: { status?: string; details?: Array<{ errorCode?: string }> };
        } | null;
        const detailCode = payload?.error?.details?.find((detail) => detail.errorCode)?.errorCode;
        const code = detailCode ?? payload?.error?.status ?? `http_${response.status}`;
        results.set(target.id, {
          delivered: false,
          permanentFailure: code === "UNREGISTERED",
          errorCode: code,
        });
      }));
    }

    return results;
  }
}
