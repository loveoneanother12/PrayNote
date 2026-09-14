import { redirect } from "next/navigation";
import { Link2, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { BrandMark } from "@/components/brand-mark";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createClient } from "@/lib/supabase/server";
import { decodePendingSocialLink, PENDING_SOCIAL_LINK_COOKIE } from "@/lib/social-link-confirmation";
import { confirmSocialLink, rejectSocialLink } from "./actions";

function maskedEmail(email: string | undefined) {
  if (!email) return "확인된 이메일";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(name.length - 2, 5)))}@${domain}`;
}

export default async function ConfirmSocialLinkPage() {
  const cookieStore = await cookies();
  const pending = decodePendingSocialLink(cookieStore.get(PENDING_SOCIAL_LINK_COOKIE)?.value);
  if (!pending) redirect("/login?error=link-confirmation-expired");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== pending.userId) redirect("/login?error=link-confirmation-expired");
  const providerName = pending.provider === "apple" ? "Apple" : "Google";

  return (
    <main className="social-link-confirm-page">
      <section className="social-link-confirm-card" aria-labelledby="social-link-confirm-title">
        <BrandMark />
        <span className="social-link-confirm-icon"><Link2 size={23} /></span>
        <p className="social-link-confirm-kicker">계정 통합 확인</p>
        <h1 id="social-link-confirm-title">동일한 이메일로 가입된 계정이 있습니다.<br />본인이신가요?</h1>
        <p className="social-link-confirm-description">
          {providerName} 계정의 이메일과 기존 PrayNote 계정의 이메일이 같습니다. 본인 계정이 맞다면 기존 기도 기록을 유지한 채 로그인 수단을 통합합니다.
        </p>
        <div className="social-link-email"><ShieldCheck size={17} /><span>{maskedEmail(user.email)}</span></div>
        <div className="social-link-confirm-actions">
          <form action={confirmSocialLink}>
            <PendingSubmitButton className="primary-button" pendingText="통합 확인 중…">네, 제 계정입니다</PendingSubmitButton>
          </form>
          <form action={rejectSocialLink}>
            <PendingSubmitButton className="outline-button" pendingText="연결 해제 중…">아니요, 통합하지 않을게요</PendingSubmitButton>
          </form>
        </div>
        <small>본인이 아니라면 새로 연결된 {providerName} 로그인 수단을 제거하고 안전하게 로그아웃합니다.</small>
      </section>
    </main>
  );
}
