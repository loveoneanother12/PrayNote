import Link from "next/link";
import { BookHeart, Check, Mail } from "lucide-react";
import { requestMagicLink } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; sent?: string; next?: string }>;
};

const errors: Record<string, string> = {
  "invalid-email": "올바른 이메일 주소를 입력해주세요.",
  "send-failed": "로그인 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
  "callback-failed": "로그인 링크가 만료되었거나 올바르지 않습니다.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

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
              <p><strong>{params.sent}</strong> 주소로 로그인 링크를 보냈어요.</p>
              <p className="auth-hint">메일이 보이지 않으면 스팸함을 확인해주세요.</p>
              <Link className="auth-link" href={`/login${params.next ? `?next=${encodeURIComponent(params.next)}` : ""}`}>다른 이메일로 로그인</Link>
            </div>
          ) : (
            <>
              <div className="auth-form-heading">
                <span>다시 만나 반가워요</span>
                <h2>PrayNote 시작하기</h2>
                <p>비밀번호 없이 이메일로 안전하게 로그인해요.</p>
              </div>
              {params.error && <p className="auth-error" role="alert">{errors[params.error] ?? "문제가 발생했습니다."}</p>}
              <form action={requestMagicLink} className="auth-form">
                <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
                <label htmlFor="email">이메일</label>
                <div className="auth-input"><Mail size={18} /><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></div>
                <button className="primary-button auth-submit" type="submit">이메일로 계속하기</button>
              </form>
              <p className="auth-terms">계속하면 PrayNote의 이용약관과 개인정보 처리방침에 동의하게 됩니다.</p>
              <Link className="auth-demo-link" href="/">로그인 전 데모 화면 보기</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
