"use client";

import Link from "next/link";
import { Apple as AppleIcon, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { signInWithApple } from "@/app/login/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type AppleAuthButtonProps = {
  mode: "login" | "signup";
  next: string;
};

export function AppleAuthButton({ mode, next }: AppleAuthButtonProps) {
  const [open, setOpen] = useState(false);
  const actionLabel = mode === "signup" ? "Apple로 회원가입" : "Apple로 계속하기";

  return (
    <>
      <button className="apple-auth-button" type="button" onClick={() => setOpen(true)}>
        <AppleIcon className="apple-mark" size={18} aria-hidden="true" />{actionLabel}
      </button>

      {open && (
        <div className="modal-backdrop google-consent-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <div className="composer-modal google-consent-modal" role="dialog" aria-modal="true" aria-labelledby="apple-consent-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="composer-heading">
              <div><span className="overview-icon"><ShieldCheck size={21} /></span><div><h2 id="apple-consent-title">Apple 계정으로 시작하기</h2><p>가입과 로그인을 위해 필수 사항을 확인해주세요.</p></div></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기"><X size={20} /></button>
            </div>
            <form action={signInWithApple} className="google-consent-form">
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="next" value={next} />
              <div className="auth-consent-list">
                <label><input name="termsAgreed" type="checkbox" value="yes" required /><span>[필수] <Link href="/terms" target="_blank">이용약관</Link> 및 <Link href="/privacy" target="_blank">개인정보 처리 안내</Link>를 확인하고 동의합니다.</span></label>
                <label><input name="ageConfirmed" type="checkbox" value="yes" required /><span>[필수] 만 14세 이상입니다.</span></label>
                <label><input name="sensitiveInfoAgreed" type="checkbox" value="yes" required /><span>[필수] 기도제목에 종교적 신념·건강 등 민감정보가 포함될 수 있으며, 서비스 제공을 위한 처리에 동의합니다.</span></label>
              </div>
              <p className="google-consent-help">기존 회원은 먼저 로그인한 뒤 ‘마이 → 프로필 수정’에서 Apple 계정을 연결하면 기존 기도 기록을 유지할 수 있어요.</p>
              <PendingSubmitButton className="apple-auth-button google-consent-submit" pendingText="Apple로 이동 중…"><AppleIcon className="apple-mark" size={18} aria-hidden="true" />{actionLabel}</PendingSubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
