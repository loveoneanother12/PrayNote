"use client";

import { BellRing, Download, HelpCircle, MoreHorizontal, Share2, ShieldAlert, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

const iosSteps = [
  <>최신 버전의 <strong>Safari</strong>로 접속해주세요.</>,
  <><Share2 size={15} /> 공유 버튼(↑)을 누르고 <strong>“홈 화면에 추가”</strong>를 선택해주세요.</>,
  <><Smartphone size={15} /> <strong>“웹 앱으로 열기”</strong>를 선택해주세요.</>,
  <><BellRing size={15} /> 홈 화면의 PrayNote 아이콘으로 앱을 연 뒤, <strong>설정 탭에서 알림 설정</strong>을 완료해주세요.</>,
];

const androidSteps = [
  <><ShieldAlert size={15} /> ‘안전하지 않은 앱 차단’으로 설치되지 않으면 <strong>“세부정보 더보기”</strong>를 눌러 진행해주세요.</>,
  <><BellRing size={15} /> 홈 화면의 PrayNote 아이콘으로 앱을 연 뒤, <strong>설정 탭에서 알림 설정</strong>을 완료해주세요.</>,
];

export function InstallGuideModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  return (
    <>
      <button className="install-guide-button" type="button" onClick={() => setOpen(true)}><HelpCircle size={17} /><span>사용 가이드</span></button>
      {open && <div className="guide-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
        <section className="install-guide-sheet" role="dialog" aria-modal="true" aria-labelledby="install-guide-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="guide-handle" aria-hidden="true" />
          <header className="guide-heading">
            <div><span><Download size={21} /></span><div><p>PrayNote 설치하기</p><h2 id="install-guide-title">웹앱 설치방법</h2></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="사용 가이드 닫기"><X size={20} /></button>
          </header>
          <p className="guide-intro">홈 화면에 추가하면 일반 앱처럼 빠르게 열고 브라우저 푸시 알림도 받을 수 있어요.</p>
          <div className="guide-platform-grid">
            <GuidePlatform name="iOS · iPhone" badge="iOS" steps={iosSteps} />
            <GuidePlatform name="Android" badge="AOS" steps={androidSteps} />
          </div>
          <footer className="guide-footer"><MoreHorizontal size={17} /><span>기기와 브라우저 버전에 따라 메뉴 이름이 조금 다를 수 있어요.</span></footer>
        </section>
      </div>}
    </>
  );
}

function GuidePlatform({ name, badge, steps }: { name: string; badge: string; steps: React.ReactNode[] }) {
  return <section className="guide-platform">
    <div className="guide-platform-title"><span>{badge}</span><h3>{name}</h3></div>
    <ol>{steps.map((step, index) => <li key={index}><em>{index + 1}</em><div>{step}</div></li>)}</ol>
  </section>;
}
