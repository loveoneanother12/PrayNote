import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "고객지원 | PrayNote",
  description: "PrayNote 이용 안내와 문의 방법",
};

export default function SupportPage() {
  return (
    <LegalDocument kind="support" eyebrow="SUPPORT" title="PrayNote 고객지원" effectiveDate="2026년 9월 14일">
      <section className="legal-section legal-highlight-section">
        <h2>도움이 필요하신가요?</h2>
        <p>로그인, 그룹 가입, 기도제목, 알림 또는 계정과 관련해 도움이 필요하면 아래 이메일로 문의해주세요. 확인 후 가능한 한 빠르게 답변드리겠습니다.</p>
        <p className="legal-contact"><strong>고객지원 이메일:</strong><br /><a href="mailto:hyunjae.lee.edu@gmail.com">hyunjae.lee.edu@gmail.com</a></p>
      </section>

      <section className="legal-section">
        <h2>문의할 때 함께 알려주세요</h2>
        <ul>
          <li>사용 중인 기기와 운영체제(iPhone, Galaxy, PC 등)</li>
          <li>접속 방식(앱, 홈 화면에 설치한 웹앱, Safari, Chrome 등)</li>
          <li>문제가 발생한 화면과 대략적인 시간</li>
          <li>가능한 경우 개인정보가 보이지 않도록 가린 화면 캡처</li>
        </ul>
        <p className="legal-note">비밀번호, 인증코드, 기도제목 원문처럼 민감한 정보는 이메일에 보내지 마세요.</p>
      </section>

      <section className="legal-section">
        <h2>계정과 개인정보 관리</h2>
        <p>프로필 수정, 알림 설정, 로그아웃과 회원 탈퇴는 로그인 후 설정 또는 마이 화면에서 이용할 수 있습니다. 개인정보 관련 요청도 고객지원 이메일로 접수할 수 있습니다.</p>
      </section>

      <footer className="legal-document-footer">
        <Link href="/privacy">개인정보처리방침</Link><br />
        <Link href="/terms">서비스 이용약관</Link>
      </footer>
    </LegalDocument>
  );
}
