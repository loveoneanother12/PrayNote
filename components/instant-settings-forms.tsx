"use client";

import { Check, LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, startTransition, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function SaveButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <button className={`primary-button ${pending ? "button-pending" : ""}`} type="submit" disabled={pending}>{pending ? <><LoaderCircle className="button-spinner" size={15} />저장 중…</> : children}</button>;
}

export function InstantProfileForm({ userId, displayName, email }: { userId: string; displayName: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("displayName") ?? "").trim();
    if (name.length < 2 || name.length > 30) return setMessage("이름은 2~30자로 입력해주세요.");
    setPending(true); setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.from("profiles").update({ display_name: name }).eq("id", userId).select("id").maybeSingle();
    setPending(false); setMessage(error || !data ? "저장하지 못했어요." : "저장했어요.");
    if (!error && data) startTransition(() => router.refresh());
  }
  return <form onSubmit={save} className="profile-settings-form"><label htmlFor="display-name">표시 이름</label><input id="display-name" name="displayName" defaultValue={displayName} minLength={2} maxLength={30} required /><label htmlFor="account-email">로그인 이메일</label><input id="account-email" value={email} readOnly aria-readonly="true" /><p>{message || "로그인 이메일은 현재 변경할 수 없습니다."}</p><SaveButton pending={pending}><Check size={16} />프로필 저장</SaveButton></form>;
}

export function InstantPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    if (password.length < 8 || password.length > 72) return setMessage("비밀번호는 8자 이상으로 입력해주세요.");
    if (password !== form.get("passwordConfirm")) return setMessage("입력한 비밀번호가 서로 다릅니다.");
    setPending(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false); setMessage(error ? "저장하지 못했어요." : "비밀번호를 저장했어요.");
    if (!error) formElement.reset();
  }
  return <form onSubmit={save} className="password-settings-form"><label htmlFor="new-password">새 비밀번호</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="8자 이상" required /><label htmlFor="new-password-confirm">비밀번호 확인</label><input id="new-password-confirm" name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="비밀번호를 한 번 더 입력" required /><p>{message || "저장 후에는 메일 링크 없이 이메일과 비밀번호로 로그인할 수 있습니다."}</p><SaveButton pending={pending}><Check size={16} />비밀번호 저장</SaveButton></form>;
}

type PreferenceProps = { inApp: boolean; newPrayer: boolean; prayerResponse: boolean; membership: boolean };

export function InstantNotificationPreferencesForm({ initial, children }: { initial: PreferenceProps; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("notification_preferences").update({
      in_app_enabled: form.get("inAppEnabled") === "on",
      new_prayer_enabled: form.get("newPrayerEnabled") === "on",
      prayer_response_enabled: form.get("prayerResponseEnabled") === "on",
      membership_enabled: form.get("membershipEnabled") === "on",
    });
    setPending(false); setMessage(error ? "저장하지 못했어요." : "저장했어요.");
  }
  return <form onSubmit={save} className="notification-settings-form" data-initial={JSON.stringify(initial)}>{children}<div className="settings-save-row"><span>{message || "기존 알림은 유지되고 새로 발생하는 알림부터 적용됩니다."}</span><SaveButton pending={pending}>알림 설정 저장</SaveButton></div></form>;
}

export function InstantSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    if (pending) return;
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login?signedOut=1");
    router.refresh();
  }
  return <button className={`logout-button ${pending ? "button-pending" : ""}`} type="button" onClick={signOut} disabled={pending}>{pending ? <LoaderCircle className="button-spinner" size={16} /> : <LogOut size={16} />}{pending ? "로그아웃 중…" : "로그아웃"}</button>;
}
