"use client";

import { Check, ChevronDown, LoaderCircle, LogOut, Palette, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, startTransition, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { ProfileDot } from "@/components/profile-dot";
import type { ProfileColor } from "@/lib/domain";
import { PROFILE_COLORS } from "@/lib/profile-colors";

function SaveButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <button className={`primary-button ${pending ? "button-pending" : ""}`} type="submit" disabled={pending}>{pending ? <><LoaderCircle className="button-spinner" size={15} />저장 중…</> : children}</button>;
}

function ProfileColorPicker({ color, onChange }: { color: ProfileColor; onChange: (color: ProfileColor) => void }) {
  const [open, setOpen] = useState(false);
  const selected = PROFILE_COLORS.find((option) => option.value === color) ?? PROFILE_COLORS[0];

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <button className="profile-color-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <span><ProfileDot color={color} label={selected.label} size="medium" /><span><strong>{selected.label}</strong><small>눌러서 다른 색 고르기</small></span></span>
      <ChevronDown size={17} />
    </button>
    {open && createPortal(
      <div className="modal-backdrop color-picker-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
        <section className="composer-modal color-picker-modal" role="dialog" aria-modal="true" aria-labelledby="color-picker-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div><span>PROFILE COLOR</span><h2 id="color-picker-title">나를 나타내는 색</h2></div>
            <button type="button" aria-label="닫기" onClick={() => setOpen(false)}><X size={19} /></button>
          </div>
          <p className="color-picker-copy"><Palette size={15} />선명한 색과 부드러운 파스텔 색 중 마음에 드는 색을 골라주세요.</p>
          <div className="profile-color-picker" role="radiogroup" aria-label="프로필 색상">
            {PROFILE_COLORS.map((option) => <button className={`profile-color-option ${color === option.value ? "selected" : ""}`} type="button" role="radio" aria-checked={color === option.value} onClick={() => onChange(option.value)} key={option.value}>
              <ProfileDot color={option.value} label={option.label} size="medium" />
              <span>{option.label}</span>
              {color === option.value && <Check size={12} aria-hidden="true" />}
            </button>)}
          </div>
          <button className="primary-button color-picker-done" type="button" onClick={() => setOpen(false)}>선택 완료</button>
        </section>
      </div>,
      document.body,
    )}
  </>;
}

export function InstantProfileForm({ userId, displayName, email, initialColor }: { userId: string; displayName: string; email: string; initialColor: ProfileColor }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<ProfileColor>(initialColor);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("displayName") ?? "").trim();
    if (name.length < 2 || name.length > 30) return setMessage("이름은 2~30자로 입력해주세요.");
    setPending(true); setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.from("profiles").update({ display_name: name, profile_color: color }).eq("id", userId).select("id").maybeSingle();
    setPending(false); setMessage(error || !data ? "저장하지 못했어요." : "저장했어요.");
    if (!error && data) startTransition(() => router.refresh());
  }
  return <form onSubmit={save} className="profile-settings-form">
    <label htmlFor="display-name">표시 이름</label>
    <input id="display-name" name="displayName" defaultValue={displayName} minLength={2} maxLength={30} required />
    <fieldset className="profile-color-fieldset">
      <legend>나를 나타내는 색</legend>
      <p>기도제목과 멤버 목록에서 프로필 사진 대신 이 색으로 표시됩니다.</p>
      <ProfileColorPicker color={color} onChange={setColor} />
    </fieldset>
    <label htmlFor="account-email">로그인 이메일</label>
    <input id="account-email" value={email} readOnly aria-readonly="true" />
    <p>{message || "로그인 이메일은 현재 변경할 수 없습니다."}</p>
    <SaveButton pending={pending}><Check size={16} />프로필 저장</SaveButton>
  </form>;
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
  return <form onSubmit={save} className="password-settings-form"><label htmlFor="new-password">새 비밀번호 입력</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="8자 이상" required /><label htmlFor="new-password-confirm">비밀번호 확인</label><input id="new-password-confirm" name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="비밀번호를 한 번 더 입력" required /><p>{message || "저장 후에는 새 비밀번호로 로그인할 수 있습니다."}</p><SaveButton pending={pending}><Check size={16} />비밀번호 저장</SaveButton></form>;
}

export function PasswordChangeSetting() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <button className="outline-button password-change-trigger" type="button" onClick={() => setOpen(true)}>비밀번호 변경</button>
    {open && createPortal(
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
        <section className="composer-modal password-change-modal" role="dialog" aria-modal="true" aria-labelledby="password-change-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div><span>ACCOUNT SECURITY</span><h2 id="password-change-title">비밀번호 변경</h2></div>
            <button type="button" aria-label="닫기" onClick={() => setOpen(false)}><X size={19} /></button>
          </div>
          <InstantPasswordForm />
        </section>
      </div>,
      document.body,
    )}
  </>;
}

type PreferenceProps = { inApp: boolean; newPrayer: boolean; prayerResponse: boolean; membership: boolean; notice: boolean };

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
      notice_enabled: form.get("noticeEnabled") === "on",
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
