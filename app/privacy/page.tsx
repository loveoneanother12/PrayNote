import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "개인정보처리방침 | PrayNote",
  description: "PrayNote 개인정보처리방침",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument kind="privacy" eyebrow="PRIVACY POLICY" title="PrayNote 개인정보처리방침" effectiveDate="2026년 9월 6일">
      <section className="legal-section">
        <h2>제1조 (개인정보처리방침의 목적)</h2>
        <p>PrayNote(이하 “서비스”)는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 서비스가 어떤 개인정보를 어떠한 목적으로 처리하고, 이용자의 권리를 어떻게 보호하는지 안내하기 위해 마련되었습니다.</p>
      </section>

      <section className="legal-section">
        <h2>제2조 (처리하는 개인정보의 항목)</h2>
        <ol>
          <li><strong>회원가입 및 인증:</strong> 이메일 주소, 이름, 비밀번호 인증정보, 만 14세 이상 확인 여부, 약관·개인정보 및 민감정보 처리 동의 기록</li>
          <li><strong>프로필:</strong> 표시 이름, 프로필 색상</li>
          <li><strong>기도 기록:</strong> 기도제목 내용, 개인기도 여부, 공유 그룹, 작성·수정·완료 일시 및 상태</li>
          <li><strong>그룹 이용:</strong> 개설·가입 그룹, 가입 신청 및 승인 상태, 그룹 내 역할, 초대코드 이용 기록</li>
          <li><strong>서비스 활동:</strong> 기도완료 반응과 날짜, 기도제목 열람 기록, 알림 기록·설정, 기도 알림 시간</li>
          <li><strong>브라우저 푸시:</strong> 푸시 구독 주소, 암호화 공개키 및 인증값, 브라우저·기기 정보</li>
          <li><strong>자동 생성 정보:</strong> IP 주소, 쿠키 및 로그인 세션 정보, 접속·오류 기록, 브라우저·운영체제 정보, 접속 일시</li>
        </ol>
        <p className="legal-note">서비스는 주민등록번호와 결제정보를 수집하지 않습니다.</p>
      </section>

      <section className="legal-section">
        <h2>제3조 (개인정보의 처리 목적)</h2>
        <ol>
          <li>회원가입, 본인확인, 로그인 및 계정 관리</li>
          <li>개인 기도 기록의 저장·동기화 및 완료 이력 제공</li>
          <li>비공개 그룹 개설·가입·권한 관리 및 선택한 그룹에 기도제목 공유</li>
          <li>기도완료 반응, 인앱 알림 및 이용자가 설정한 브라우저 푸시 알림 제공</li>
          <li>부정 이용 방지, 보안 유지, 장애 대응 및 서비스 개선</li>
          <li>이용자 문의와 권리 행사 처리</li>
        </ol>
      </section>

      <section className="legal-section legal-highlight-section">
        <h2>제4조 (기도제목에 포함될 수 있는 민감정보의 처리)</h2>
        <p>기도제목에는 이용자의 종교적 신념, 건강·질병 또는 사생활에 관한 정보 등 「개인정보 보호법」상 민감정보가 포함될 수 있습니다. 서비스는 기도 기록의 저장·동기화 및 이용자가 선택한 그룹과의 공유를 위해 이를 처리하며, 일반 개인정보 처리와 구분하여 이용자의 별도 동의를 받습니다.</p>
        <p>민감정보는 개인기도로 설정하면 작성자 본인만 볼 수 있고, 그룹 공유를 선택한 경우 해당 그룹의 승인된 회원만 볼 수 있습니다. 이용자는 작성 또는 수정 과정에서 공개 범위를 선택할 수 있습니다.</p>
        <p>타인의 이름, 건강상태 등 개인정보나 민감정보는 본인의 동의 또는 정당한 권한 없이 기도제목에 작성하지 않아야 합니다.</p>
        <p className="legal-law-link"><a href="https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1027416043" target="_blank" rel="noreferrer">관련 법령: 개인정보 보호법 제23조(민감정보의 처리 제한)</a></p>
      </section>

      <section className="legal-section">
        <h2>제5조 (개인정보의 처리 및 보유 기간)</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>구분</th><th>보유 기간</th></tr></thead>
            <tbody>
              <tr><td>회원·프로필·동의 기록</td><td>회원 탈퇴 시까지</td></tr>
              <tr><td>기도제목·그룹·활동·알림 정보</td><td>회원 탈퇴 또는 해당 정보 삭제 시까지</td></tr>
              <tr><td>브라우저 푸시 구독 정보</td><td>푸시 알림 해제 또는 회원 탈퇴 시까지</td></tr>
              <tr><td>Vercel 런타임 로그</td><td>현재 요금제 기준 1시간</td></tr>
              <tr><td>Supabase 서비스 로그</td><td>현재 요금제 기준 1일</td></tr>
            </tbody>
          </table>
        </div>
        <p>회원 탈퇴 시 개인 기도제목은 삭제하며, 그룹에 공유한 기도제목은 기본적으로 작성자 표시를 “(탈퇴한 사용자)”로 변경하여 익명화합니다. 탈퇴 화면에서 “네, 삭제하겠습니다”에 체크하면 개인기도와 그룹에 공유한 기도제목을 모두 삭제합니다.</p>
        <p>관계 법령에 따라 일정 기간 보관할 의무가 있는 정보는 해당 기간 동안 별도로 보관한 후 파기합니다. 백업본은 수탁업체의 백업 주기에 따라 순차적으로 파기되며 복구 외 목적으로 사용하지 않습니다.</p>
      </section>

      <section className="legal-section">
        <h2>제6조 (개인정보의 제3자 제공 및 공개 범위)</h2>
        <p>서비스는 이용자의 개인정보를 영리 목적으로 판매하지 않으며, 이용자의 동의 없이 제3자에게 제공하지 않습니다. 다만 이용자가 그룹 공유를 직접 선택한 경우 다음 정보가 선택한 그룹의 승인된 회원에게 공개됩니다.</p>
        <ul>
          <li><strong>공개 대상:</strong> 이용자가 선택한 그룹의 승인된 회원</li>
          <li><strong>공개 항목:</strong> 표시 이름, 프로필 색상, 기도제목, 작성·완료 일시, 기도완료 반응 정보</li>
          <li><strong>공개 목적:</strong> 그룹 내 기도제목 공유와 공동 기도</li>
          <li><strong>공개 기간:</strong> 게시물 삭제, 그룹 삭제 또는 해당 그룹에 대한 접근권한 종료 시까지</li>
        </ul>
        <p>법령에 특별한 규정이 있거나 수사기관 등이 적법한 절차에 따라 요구하는 경우에는 예외로 합니다.</p>
      </section>

      <section className="legal-section">
        <h2>제7조 (개인정보 처리업무의 위탁)</h2>
        <p>서비스는 안정적인 제공을 위해 다음 업체에 개인정보 처리업무를 위탁합니다.</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>수탁업체</th><th>위탁업무</th><th>보유 기간</th></tr></thead>
            <tbody>
              <tr><td>Supabase, Inc.</td><td>회원 인증, 데이터베이스 저장·동기화, 실시간 처리 및 서비스 로그 관리</td><td>회원 탈퇴, 정보 삭제 또는 위탁계약 종료 시까지</td></tr>
              <tr><td>Vercel Inc.</td><td>웹서비스 호스팅·전송, 서버 기능 실행, 보안 및 오류 로그 처리</td><td>회원 탈퇴, 정보 삭제 또는 위탁계약 종료 시까지. 런타임 로그는 현재 1시간</td></tr>
              <tr><td>이용 브라우저의 푸시 서비스 제공자</td><td>이용자가 신청한 브라우저 푸시 알림 전달</td><td>알림 전달 또는 푸시 구독 해제 시까지</td></tr>
            </tbody>
          </table>
        </div>
        <p>서비스는 수탁자가 개인정보를 안전하게 처리하도록 관련 법령에 따라 관리·감독합니다.</p>
      </section>

      <section className="legal-section">
        <h2>제8조 (개인정보의 국외 이전)</h2>
        <p>주요 서비스 실행과 데이터 저장은 대한민국 서울 리전으로 설정되어 있습니다. 다만 해외 사업자의 플랫폼 운영, 기술지원, 보안 대응 및 브라우저 푸시 전달 과정에서 다음과 같이 국외에서 처리되거나 접근될 수 있습니다.</p>
        <div className="legal-table-wrap wide">
          <table className="legal-table">
            <thead><tr><th>이전받는 자</th><th>국가·위치</th><th>항목·목적</th><th>시기·방법 및 기간</th></tr></thead>
            <tbody>
              <tr><td>Supabase, Inc.</td><td>주 데이터: 대한민국 서울<br />운영·지원: 미국 및 재수탁자 소재 국가</td><td>제2조의 정보 / 인증·DB 운영·지원</td><td>서비스 이용 시 암호화된 네트워크 전송 / 회원 탈퇴·삭제 또는 계약 종료 시까지</td></tr>
              <tr><td>Vercel Inc.</td><td>서버 실행: 대한민국 서울<br />플랫폼 운영: 미국 및 재수탁자 소재 국가</td><td>웹 요청, IP, 접속·오류 정보 / 호스팅·보안·장애 대응</td><td>서비스 이용 시 암호화된 네트워크 전송 / 런타임 로그는 현재 1시간, 그 외 계약 종료 또는 삭제 시까지</td></tr>
              <tr><td>Apple, Google 등 이용 브라우저의 푸시 서비스 제공자</td><td>미국 등 각 제공자의 처리 국가</td><td>푸시 구독 식별자와 민감 내용을 제외한 알림 문구 / 알림 전달</td><td>알림 발송 시 암호화 전송 / 알림 전달 또는 구독 해제 시까지</td></tr>
            </tbody>
          </table>
        </div>
        <p>Supabase의 주 데이터베이스는 서울 리전(ap-northeast-2), Vercel 서버 기능은 서울 리전(icn1)으로 설정되어 있습니다. 이용자는 서비스 탈퇴 또는 브라우저 푸시 해제를 통해 이전을 거부할 수 있으며, 필수적인 해외 처리에 동의하지 않는 경우 일부 또는 전체 서비스 이용이 제한될 수 있습니다.</p>
        <p className="legal-law-link"><a href="https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033215841" target="_blank" rel="noreferrer">관련 법령: 개인정보 보호법 제28조의8(개인정보의 국외 이전)</a></p>
      </section>

      <section className="legal-section">
        <h2>제9조 (개인정보의 파기)</h2>
        <ol>
          <li>보유기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.</li>
          <li>전자적 파일은 복구하거나 재생할 수 없는 방법으로 삭제합니다.</li>
          <li>회원이 기도제목을 삭제하면 서비스 화면에서 즉시 접근이 제한되며, 운영상 보관본과 백업본은 파기 절차에 따라 삭제합니다.</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제10조 (이용자와 법정대리인의 권리 및 행사방법)</h2>
        <p>이용자는 언제든지 자신의 개인정보를 열람·수정할 수 있고, 기도제목과 푸시 구독을 삭제하거나 회원 탈퇴를 요청할 수 있습니다. 권리 행사는 서비스 내 설정 메뉴 또는 개인정보 보호책임자 이메일을 통해 요청할 수 있으며, 서비스는 본인확인 후 지체 없이 처리합니다.</p>
      </section>

      <section className="legal-section">
        <h2>제11조 (만 14세 미만 아동의 개인정보)</h2>
        <p>서비스는 만 14세 미만 아동의 회원가입을 허용하지 않습니다. 회원가입 시 이용자는 만 14세 이상임을 확인해야 합니다.</p>
      </section>

      <section className="legal-section">
        <h2>제12조 (쿠키 및 자동수집 장치)</h2>
        <p>서비스는 로그인 상태 유지와 보안을 위해 필수 쿠키 및 세션 정보를 사용합니다. 이용자는 브라우저 설정에서 쿠키를 삭제하거나 차단할 수 있으나, 필수 쿠키를 차단하면 로그인 등 일부 기능을 이용할 수 없습니다.</p>
      </section>

      <section className="legal-section">
        <h2>제13조 (개인정보의 안전성 확보조치)</h2>
        <p>서비스는 전송구간 암호화, 비밀번호의 안전한 인증 처리, 데이터베이스 접근권한 통제, 사용자별·그룹별 접근정책, 보안 로그 및 정기적인 권한 점검 등 개인정보 보호에 필요한 기술적·관리적 조치를 적용합니다.</p>
      </section>

      <section className="legal-section">
        <h2>제14조 (개인정보 보호책임자)</h2>
        <p>개인정보 처리에 관한 문의, 불만처리 및 권리 행사는 아래 연락처로 요청할 수 있습니다.</p>
        <p className="legal-contact"><strong>담당:</strong> PrayNote 개인정보보호 담당자<br /><strong>이메일:</strong> <a href="mailto:hyunjae.lee.edu@gmail.com">hyunjae.lee.edu@gmail.com</a></p>
      </section>

      <section className="legal-section">
        <h2>제15조 (개인정보처리방침의 변경)</h2>
        <p>본 방침의 내용이 변경되는 경우 적용일자와 변경 사유를 서비스 내 공지를 통해 안내합니다. 이용자의 권리에 중대한 영향을 미치는 변경은 충분한 기간을 두고 안내합니다.</p>
      </section>

      <footer className="legal-document-footer">
        <p><strong>공고일자:</strong> 2026년 9월 6일</p>
        <p><strong>시행일자:</strong> 2026년 9월 6일</p>
        <Link href="/terms">PrayNote 서비스 이용약관 보기</Link>
      </footer>
    </LegalDocument>
  );
}
