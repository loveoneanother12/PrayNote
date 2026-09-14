"use client";

import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { signInWithGoogle } from "@/app/login/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type GoogleAuthButtonProps = {
  mode: "login" | "signup";
  next: string;
};

export function GoogleAuthButton({ mode, next }: GoogleAuthButtonProps) {
  const [open, setOpen] = useState(false);
  const actionLabel = mode === "signup" ? "Google로 회원가입" : "Google로 계속하기";

  return (
    <>
      <button className="google-auth-button" type="button" onClick={() => setOpen(true)}>
        <span className="google-mark" aria-hidden="true">G</span>{actionLabel}
      </button>
      {open && (
        <div className="modal-backdrop google-consent-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <div className="composer-modal google-consent-modal" role="dialog" aria-modal="true" aria-labelledby="google-consent-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="composer-heading">
              <div><span className="overview-icon"><ShieldCheck size={21} /></span><div><h2 id="google-consent-title">Google 계정으로 시작하기</h2><p>가입과 로그인을 위해 필수 사항을 확인해주세요.</p></div></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기"><X size={20} /></button>
            </div>
            <form action={signInWithGoogle} className="google-consent-form">
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="next" value={next} />
              <div className="auth-consent-list">
                <label><input name="termsAgreed" type="checkbox" value="yes" required /><span>[필수] <Link href="/terms" target="_blank">이용약관</Link> 및 <Link href="/privacy" target="_blank">개인정보 처리 안내</Link>를 확인하고 동의합니다.</span></label>
                <label><input name="ageConfirmed" type="checkbox" value="yes" required /><span>[필수] 만 14세 이상입니다.</span></label>
                <label><input name="sensitiveInfoAgreed" type="checkbox" value="yes" required /><span>[필수] 기도제목에 종교적 신념·건강 등 민감정보가 포함될 수 있으며, 서비스 제공을 위한 처리에 동의합니다.</span></label>
              </div>
              <p className="google-consent-help">동일한 이메일의 기존 계정이 확인되면 본인 여부를 먼저 묻고, 동의한 경우에만 기존 기도 기록과 Google 로그인을 통합합니다.</p>
              <PendingSubmitButton className="primary-button google-consent-submit" pendingText="Google로 이동 중…"><span className="google-mark inverse" aria-hidden="true">G</span>{actionLabel}</PendingSubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
