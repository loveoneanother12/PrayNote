"use client";

import { BellRing, Check, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PushState = "checking" | "unsupported" | "needs-install" | "off" | "on" | "denied";
type PushAction = "enable" | "disable" | "test" | null;

type BrowserPushSettingsProps = {
  initialEnabled: boolean;
  vapidPublicKey: string;
};

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function BrowserPushSettings({ initialEnabled, vapidPublicKey }: BrowserPushSettingsProps) {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");
  const [workingAction, setWorkingAction] = useState<PushAction>(null);

  useEffect(() => {
    async function inspect() {
      if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        return;
      }
      if (isIos() && !isStandalone()) {
        setState("needs-install");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await registration.update();
      const subscription = await registration.pushManager.getSubscription();
      setState(subscription && initialEnabled ? "on" : "off");
    }

    inspect().catch(() => setState("unsupported"));
  }, [initialEnabled, vapidPublicKey]);

  async function enablePush() {
    if (workingAction) return;
    setWorkingAction("enable");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      await registration.update();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(vapidPublicKey),
      });
      const serialized = subscription.toJSON();
      if (!serialized.keys?.p256dh || !serialized.keys.auth) throw new Error("subscription_keys_missing");

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("session_missing");
      const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert({
        user_id: userData.user.id,
        endpoint: subscription.endpoint,
        p256dh: serialized.keys.p256dh,
        auth: serialized.keys.auth,
        user_agent: navigator.userAgent.slice(0, 500),
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (subscriptionError) throw subscriptionError;

      const { error: preferenceError } = await supabase.from("notification_preferences")
        .update({ push_enabled: true })
        .eq("user_id", userData.user.id);
      if (preferenceError) throw preferenceError;

      setState("on");
      window.dispatchEvent(new CustomEvent("praynote:push-status", { detail: { enabled: true } }));
      setMessage("이 기기의 브라우저 푸시를 켰어요.");
    } catch (error) {
      console.error("Failed to enable browser push", error);
      setState("off");
      setMessage("브라우저 푸시를 켜지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function disablePush() {
    if (workingAction) return;
    setWorkingAction("disable");
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("session_missing");

      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true });
      if (!count) {
        await supabase.from("notification_preferences").update({ push_enabled: false }).eq("user_id", userData.user.id);
      }
      setState("off");
      window.dispatchEvent(new CustomEvent("praynote:push-status", { detail: { enabled: false } }));
      setMessage("이 기기의 브라우저 푸시를 껐어요.");
    } catch (error) {
      console.error("Failed to disable browser push", error);
      setState("on");
      setMessage("브라우저 푸시 설정을 변경하지 못했어요.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function sendTest() {
    if (workingAction) return;
    setWorkingAction("test");
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      if (!response.ok) throw new Error("test_push_failed");
      setMessage("테스트 알림을 보냈어요. 잠시 후 기기에서 확인해주세요.");
    } catch {
      setMessage("테스트 알림을 보내지 못했어요.");
    } finally {
      setWorkingAction(null);
    }
  }

  const copy = state === "on"
    ? { title: "브라우저 푸시 켜짐", description: "이 기기에서 새로운 기도 소식을 받을 수 있어요." }
    : state === "needs-install"
      ? { title: "홈 화면에 먼저 추가해주세요", description: "Safari 공유 버튼 → 홈 화면에 추가 후 PrayNote 앱에서 다시 켜주세요." }
      : state === "denied"
        ? { title: "알림 권한이 차단됐어요", description: "기기 설정에서 PrayNote의 알림 권한을 허용해주세요." }
        : state === "unsupported"
          ? { title: "이 브라우저에서는 사용할 수 없어요", description: "최신 Safari 또는 Chrome에서 홈 화면에 추가한 뒤 이용해주세요." }
          : { title: "브라우저 푸시", description: "앱을 닫아도 새로운 기도 소식을 기기 알림으로 받아요." };

  return (
    <div className="browser-push-setting">
      <span className={`setting-category-icon push ${state === "on" ? "enabled" : ""}`}>
        {state === "on" ? <BellRing size={17} /> : state === "needs-install" ? <Download size={17} /> : <Smartphone size={17} />}
      </span>
      <div className="browser-push-copy">
        <strong>{copy.title}</strong>
        <small>{copy.description}</small>
        {message && <em role="status">{message}</em>}
      </div>
      <div className="browser-push-actions">
        {state === "on" && <button className={workingAction === "test" ? "button-pending" : ""} type="button" onClick={sendTest} disabled={workingAction !== null}>{workingAction === "test" ? "발송 중…" : "테스트"}</button>}
        {(state === "on" || state === "off") && (
          <button className={`${state === "on" ? "secondary" : "primary"} ${workingAction === "enable" || workingAction === "disable" ? "button-pending" : ""}`} type="button" onClick={state === "on" ? disablePush : enablePush} disabled={workingAction !== null}>
            {workingAction === "enable" ? "켜는 중…" : workingAction === "disable" ? "끄는 중…" : state === "on" ? "끄기" : "켜기"}{state === "on" && !workingAction && <Check size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}
