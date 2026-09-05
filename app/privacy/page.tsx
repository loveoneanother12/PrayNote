import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookHeart, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "개인정보처리방침 | PrayNote",
  description: "PrayNote 개인정보처리방침",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <header className="legal-topbar">
        <Link className="brand legal-brand" href="/">
          <span className="brand-mark"><BookHeart size={21} /></span>
          <span>PrayNote</span>
        </Link>
        <Link className="legal-back-link" href="/login">
          <ArrowLeft size={16} /> 로그인으로 돌아가기
        </Link>
      </header>

      <article className="legal-card">
        <div className="legal-heading">
          <span className="legal-icon"><ShieldCheck size={25} /></span>
          <div>
            <p>PRIVACY POLICY</p>
            <h1>개인정보처리방침</h1>
          </div>
        </div>
        <p className="legal-effective-date">시행일: 2026년 9월 1일</p>

        <section className="legal-section">
          <h2>1. 개인정보의 처리 목적</h2>
          <p>PrayNote(이하 &quot;서비스&quot;)는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
          <ul>
            <li><strong>회원 가입 및 관리:</strong> 회원제 서비스 이용에 따른 본인확인, 서비스 부정이용 방지</li>
            <li><strong>서비스 제공:</strong> 기도 기록 저장 및 동기화 서비스 제공</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. 수집하는 개인정보 항목</h2>
          <p>서비스는 회원가입 및 로그인을 통해 다음의 개인정보를 수집합니다:</p>
          <ul>
            <li>이메일 주소</li>
            <li>이름</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. 개인정보의 보유 및 이용 기간</h2>
          <p>이용자의 개인정보는 회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 지체 없이 파기합니다.</p>
        </section>

        <section className="legal-section">
          <h2>4. 개인정보의 제3자 제공</h2>
          <p>서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의해 요구되는 경우는 예외로 합니다.</p>
        </section>

        <section className="legal-section">
          <h2>5. 개인정보의 파기</h2>
          <p>서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
        </section>

        <section className="legal-section">
          <h2>6. 이용자의 권리</h2>
          <p>이용자는 언제든지 자신의 개인정보에 대한 열람, 수정, 삭제를 요청할 수 있습니다. 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.</p>
        </section>

        <section className="legal-section">
          <h2>7. 개인정보 보호책임자</h2>
          <p>서비스의 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <p className="legal-contact">문의: <a href="mailto:hyunjae.lee.edu@gmail.com">hyunjae.lee.edu@gmail.com</a></p>
        </section>

        <section className="legal-section">
          <h2>8. 개인정보처리방침의 변경</h2>
          <p>이 개인정보처리방침은 2026년 9월 1일부터 적용됩니다. 변경사항이 있을 경우 서비스 내 공지를 통해 안내드리겠습니다.</p>
        </section>
      </article>
    </main>
  );
}
