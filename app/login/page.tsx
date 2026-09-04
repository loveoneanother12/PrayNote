import Link from "next/link";
import { BookHeart, Check, LockKeyhole, Mail, UserRound } from "lucide-react";
import { requestMagicLink, signInWithPassword, signUpWithPassword } from "./actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; sent?: string; next?: string; mode?: string; notice?: string }>;
};

const errors: Record<string, string> = {
  "invalid-email": "올바른 이메일 주소를 입력해주세요.",
  "invalid-login": "이메일과 8자 이상의 비밀번호를 확인해주세요.",
  "login-failed": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "invalid-signup": "이름은 2~30자, 이메일은 올바른 형식으로 입력해주세요.",
  "weak-password": "비밀번호는 8자 이상으로 입력해주세요.",
  "password-mismatch": "입력한 비밀번호가 서로 다릅니다.",
  "email-in-use": "이미 가입된 이메일입니다. 로그인하거나 기존 계정 전환을 이용해주세요.",
  "signup-failed": "회원가입을 완료하지 못했습니다. 입력 내용을 확인해주세요.",
  "send-failed": "로그인 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
  "email-rate-limit": "메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
  "callback-failed": "로그인 링크가 만료되었거나 올바르지 않습니다.",
};

function modeHref(mode: "login" | "signup", next?: string) {
  return `/login?mode=${mode}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : params.mode === "magic" ? "magic" : "login";
  const next = params.next ?? "/dashboard";

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark"><BookHeart size={22} /></span>
          <span>PrayNote</span>
        </Link>
        <div className="auth-story-copy">
          <span className="auth-kicker">함께 기억하고, 함께 기도해요</span>
          <h1>마음을 나누는 순간,<br />기도는 시작됩니다.</h1>
          <p>신뢰하는 공동체 안에서 기도제목을 안전하게 나누고 서로를 위한 마음을 전해보세요.</p>
          <ul>
            <li><Check size={16} />승인된 그룹 멤버만 볼 수 있어요</li>
            <li><Check size={16} />누가 함께 기도했는지 확인할 수 있어요</li>
            <li><Check size={16} />민감한 내용은 알림에 노출하지 않아요</li>
          </ul>
        </div>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-card">
          {params.sent ? (
            <div className="mail-sent">
              <span><Mail size={27} /></span>
              <h2>메일을 확인해주세요</h2>
              <p><strong>{params.sent}</strong> 주소로 기존 계정 로그인 링크를 보냈어요.</p>
              <p className="auth-hint">로그인 후 설정에서 비밀번호를 만들어주세요.</p>
              <Link className="auth-link" href={modeHref("login", params.next)}>비밀번호로 로그인</Link>
            </div>
          ) : (
            <>
              <div className="auth-form-heading">
                <span>{mode === "signup" ? "처음 만나 반가워요" : mode === "magic" ? "기존 계정 전환" : "다시 만나 반가워요"}</span>
                <h2>{mode === "signup" ? "PrayNote 회원가입" : mode === "magic" ? "메일로 한 번 로그인" : "PrayNote 로그인"}</h2>
                <p>{mode === "signup" ? "간단한 정보로 계정을 만들고 바로 시작해요." : mode === "magic" ? "기존 메일 계정에 비밀번호를 연결하기 위한 기능입니다." : "이메일과 비밀번호로 안전하게 로그인해요."}</p>
              </div>

              {mode !== "magic" && (
                <nav className="auth-mode-switch" aria-label="로그인과 회원가입 선택">
                  <Link className={mode === "login" ? "active" : ""} href={modeHref("login", params.next)}>로그인</Link>
                  <Link className={mode === "signup" ? "active" : ""} href={modeHref("signup", params.next)}>회원가입</Link>
                </nav>
              )}

              {params.notice === "confirm-email" && <p className="auth-notice">가입 확인 메일을 확인한 뒤 로그인해주세요.</p>}
              {params.error && <p className="auth-error" role="alert">{errors[params.error] ?? "문제가 발생했습니다."}</p>}

              {mode === "signup" ? (
                <form action={signUpWithPassword} className="auth-form">
                  <input type="hidden" name="next" value={next} />
                  <label htmlFor="display-name">이름</label>
                  <div className="auth-input"><UserRound size={18} /><input id="display-name" name="displayName" type="text" autoComplete="name" minLength={2} maxLength={30} placeholder="그룹에 표시할 이름" required /></div>
                  <label htmlFor="email">이메일</label>
                  <div className="auth-input"><Mail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
                  <label htmlFor="password">비밀번호</label>
                  <div className="auth-input"><LockKeyhole size={18} /><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="8자 이상" required /></div>
                  <label htmlFor="password-confirm">비밀번호 확인</label>
                  <div className="auth-input"><LockKeyhole size={18} /><input id="password-confirm" name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="비밀번호를 한 번 더 입력" required /></div>
                  <PendingSubmitButton className="primary-button auth-submit" pendingText="가입 중…">회원가입하고 시작하기</PendingSubmitButton>
                </form>
              ) : mode === "magic" ? (
                <form action={requestMagicLink} className="auth-form">
                  <input type="hidden" name="next" value={next} />
                  <label htmlFor="email">기존 로그인 이메일</label>
                  <div className="auth-input"><Mail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
                  <PendingSubmitButton className="primary-button auth-submit" pendingText="메일 보내는 중…">전환용 로그인 메일 받기</PendingSubmitButton>
                  <Link className="auth-inline-link" href={modeHref("login", params.next)}>비밀번호 로그인으로 돌아가기</Link>
                </form>
              ) : (
                <form action={signInWithPassword} className="auth-form">
                  <input type="hidden" name="next" value={next} />
                  <label htmlFor="email">이메일</label>
                  <div className="auth-input"><Mail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
                  <label htmlFor="password">비밀번호</label>
                  <div className="auth-input"><LockKeyhole size={18} /><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} placeholder="비밀번호" required /></div>
                  <PendingSubmitButton className="primary-button auth-submit" pendingText="로그인 중…">로그인</PendingSubmitButton>
                  <Link className="auth-inline-link" href={`/login?mode=magic&next=${encodeURIComponent(next)}`}>기존 메일 링크 계정 전환</Link>
                </form>
              )}

              <p className="auth-terms">계속하면 PrayNote의 이용약관과 개인정보 처리방침에 동의하게 됩니다.</p>
              <Link className="auth-demo-link" href="/">로그인 전 데모 화면 보기</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
