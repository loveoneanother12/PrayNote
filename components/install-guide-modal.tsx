"use client";

import { BellRing, Download, HelpCircle, Home, MoreHorizontal, Share2, Smartphone, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  getKoreaDateKey,
  INSTALL_GUIDE_DISMISSED_DATE_KEY,
  INSTALL_GUIDE_AUTO_PROMPT_END_AT,
  INSTALL_GUIDE_NEXT_PROMPT_KEY,
  INSTALL_GUIDE_REPEAT_MS,
  isInstallGuideAutoPromptActive,
  installGuidePromptDelay,
} from "@/lib/install-guide-prompt";

const iosSteps = [
  <>최신 버전의 <strong>Safari</strong>로 접속해주세요.</>,
  <><Home size={15} /> PrayNote의 <strong>홈 탭</strong>으로 이동해주세요.</>,
  <><Share2 size={15} /> 공유 버튼(↑)을 누르고 <strong>“홈 화면에 추가”</strong>를 선택해주세요.</>,
  <><Smartphone size={15} /> <strong>“웹 앱으로 열기”</strong>를 선택해주세요.</>,
  <><BellRing size={15} /> <strong>설정 탭 &gt; 외부 알림 &gt; 브라우저 푸시</strong>에서 푸시 알림을 ON으로 설정하고, 권한 허용 창이 뜨면 <strong>허용</strong>을 눌러주세요.</>,
];

const chromeSteps = [
  <>최신 버전의 <strong>Chrome</strong>에서 PrayNote에 접속해주세요.</>,
  <><Home size={15} /> PrayNote의 <strong>홈 탭</strong>으로 이동해주세요.</>,
  <><MoreHorizontal size={15} /> 주소창 오른쪽의 <strong>⋮ 더보기</strong>를 눌러주세요.</>,
  <><Download size={15} /> <strong>“설치 및 바로가기 만들기 → 설치”</strong>를 선택해주세요. Chrome 버전에 따라 <strong>“앱 설치”</strong> 또는 <strong>“홈 화면에 추가”</strong>로 표시될 수 있어요.</>,
  <><BellRing size={15} /> <strong>설정 탭 &gt; 외부 알림 &gt; 브라우저 푸시</strong>에서 푸시 알림을 ON으로 설정하고, 권한 허용 창이 뜨면 <strong>허용</strong>을 눌러주세요.</>,
];

const samsungInternetSteps = [
  <>최신 버전의 <strong>삼성 인터넷</strong>에서 PrayNote에 접속해주세요.</>,
  <><Home size={15} /> PrayNote의 <strong>홈 탭</strong>으로 이동해주세요.</>,
  <><Download size={15} /> 주소창에 <strong>+ 아이콘</strong>이 표시되면 눌러서 홈 화면에 추가해주세요.</>,
  <><MoreHorizontal size={15} /> + 아이콘이 없다면 하단의 <strong>☰ 메뉴 → 현재 페이지 추가 → 홈 화면</strong>을 선택해주세요.</>,
  <><BellRing size={15} /> <strong>설정 탭 &gt; 외부 알림 &gt; 브라우저 푸시</strong>에서 푸시 알림을 ON으로 설정하고, 권한 허용 창이 뜨면 <strong>허용</strong>을 눌러주세요.</>,
];

type InstallGuideModalProps = {
  initialOpen?: boolean;
  onCompleteHref?: string;
  autoPrompt?: boolean;
};

export function InstallGuideModal({ initialOpen = false, onCompleteHref, autoPrompt = false }: InstallGuideModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [automatic, setAutomatic] = useState(initialOpen);
  const [scheduleVersion, setScheduleVersion] = useState(0);

  const finishOnboarding = useCallback(() => {
    if (initialOpen) router.replace(onCompleteHref || "/dashboard", { scroll: false });
  }, [initialOpen, onCompleteHref, router]);

  const closeGuide = useCallback(() => {
    setOpen(false);
    if (automatic) {
      localStorage.setItem(INSTALL_GUIDE_NEXT_PROMPT_KEY, String(Date.now() + INSTALL_GUIDE_REPEAT_MS));
      setScheduleVersion((version) => version + 1);
    }
    finishOnboarding();
  }, [automatic, finishOnboarding]);

  const dismissToday = useCallback(() => {
    localStorage.setItem(INSTALL_GUIDE_DISMISSED_DATE_KEY, getKoreaDateKey());
    localStorage.removeItem(INSTALL_GUIDE_NEXT_PROMPT_KEY);
    setOpen(false);
    setScheduleVersion((version) => version + 1);
    finishOnboarding();
  }, [finishOnboarding]);

  useEffect(() => {
    if (!autoPrompt || initialOpen) return;
    let timer: number | undefined;
    const schedule = () => {
      if (!isInstallGuideAutoPromptActive()) {
        setAutomatic(false);
        setOpen(false);
        return;
      }
      const storedNextPrompt = Number(localStorage.getItem(INSTALL_GUIDE_NEXT_PROMPT_KEY));
      const delay = installGuidePromptDelay({
        dismissedDate: localStorage.getItem(INSTALL_GUIDE_DISMISSED_DATE_KEY),
        nextPromptAt: Number.isFinite(storedNextPrompt) && storedNextPrompt > 0 ? storedNextPrompt : null,
      });
      if (delay <= 0) {
        setAutomatic(true);
        setOpen(true);
        return;
      }
      timer = window.setTimeout(schedule, Math.min(delay + 1000, 2_147_000_000));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [autoPrompt, initialOpen, scheduleVersion]);

  useEffect(() => {
    if (!autoPrompt || initialOpen) return;
    const remaining = INSTALL_GUIDE_AUTO_PROMPT_END_AT - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => {
      setAutomatic(false);
      setOpen(false);
    }, Math.min(remaining + 1000, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [autoPrompt, initialOpen]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeGuide();
    window.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("modal-open");
    };
  }, [closeGuide, open]);

  return (
    <>
      <button className="install-guide-button" type="button" onClick={() => { setAutomatic(false); setOpen(true); }}><HelpCircle size={17} /><span>사용 가이드</span></button>
      {open && createPortal(<div className="guide-backdrop" role="presentation" onMouseDown={closeGuide}>
        <section className="install-guide-sheet" role="dialog" aria-modal="true" aria-labelledby="install-guide-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="guide-handle" aria-hidden="true" />
          <header className="guide-heading">
            <div><span><Download size={21} /></span><div><p>사용 가이드</p><h2 id="install-guide-title">웹앱 설치 방법</h2></div></div>
            <button type="button" onClick={closeGuide} aria-label="사용 가이드 닫기"><X size={20} /></button>
          </header>
          {automatic && <div className="guide-prompt-message"><Sparkles size={18} /><div><strong>PrayNote를 앱처럼 더 편하게 사용해보세요.</strong><span>홈 화면에 설치하고 브라우저 푸시를 ON으로 설정하면 새로운 기도 소식을 놓치지 않을 수 있어요.</span></div></div>}
          <p className="guide-intro">홈 화면에 추가하면 일반 앱처럼 빠르게 열고 브라우저 푸시 알림도 받을 수 있어요.</p>
          <div className="guide-platform-grid">
            <GuidePlatform name="iOS · iPhone" badge="iOS" steps={iosSteps} />
            <GuidePlatform name="Android · Chrome" badge="AOS" steps={chromeSteps} />
            <GuidePlatform name="Android · 삼성 인터넷" badge="AOS" steps={samsungInternetSteps} />
          </div>
          <footer className="guide-footer"><Home size={17} /><div><strong>웹앱 설치는 메인 대시보드의 ‘홈’ 탭에서 진행해주세요.</strong><span>기기와 브라우저 버전에 따라 메뉴 이름이 조금 다를 수 있어요.</span></div></footer>
          <p className="guide-private-mode-note">비밀 모드·시크릿 모드에서는 설치하지 마세요. 로그인한 브라우저와 설치에 사용한 브라우저가 다르면 다시 로그인이 필요할 수 있어요.</p>
          {automatic && <div className="guide-reminder-actions"><button type="button" onClick={dismissToday}>오늘은 그만보기</button><button type="button" className="primary" onClick={closeGuide}>닫기</button></div>}
        </section>
      </div>, document.body)}
    </>
  );
}

function GuidePlatform({ name, badge, steps }: { name: string; badge: string; steps: React.ReactNode[] }) {
  return <section className="guide-platform">
    <div className="guide-platform-title"><span>{badge}</span><h3>{name}</h3></div>
    <ol>{steps.map((step, index) => <li key={index}><em>{index + 1}</em><div>{step}</div></li>)}</ol>
  </section>;
}
