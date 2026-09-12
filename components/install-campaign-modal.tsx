"use client";

import { BellRing, Download, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const CAMPAIGN_END_AT = Date.parse("2026-09-13T00:00:00+09:00");
const DISMISSED_KEY = "praynote_install_campaign_20260912_dismissed";

type Platform = "ios" | "galaxy";

function isInstalled() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function InstallCampaignModal({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("ios");

  const close = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setOpen(false);
  }, []);

  useEffect(() => {
    if (disabled || Date.now() >= CAMPAIGN_END_AT || localStorage.getItem(DISMISSED_KEY) === "true") return;
    if (isInstalled() || !window.matchMedia("(max-width: 820px)").matches) return;
    const timer = window.setTimeout(() => {
      setPlatform(/Android/i.test(navigator.userAgent) ? "galaxy" : "ios");
      setOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [close, open]);

  if (!open) return null;

  const isIos = platform === "ios";
  return createPortal(
    <div className="install-campaign-backdrop" role="presentation">
      <section className="install-campaign-modal" role="dialog" aria-modal="true" aria-labelledby="install-campaign-title">
        <button className="install-campaign-close" type="button" onClick={close} aria-label="설치 안내 닫기"><X size={19} /></button>
        <div className="install-campaign-icon"><Download size={23} /></div>
        <p className="install-campaign-eyebrow">PrayNote를 더 편하게</p>
        <h2 id="install-campaign-title">웹앱 설치가 완료되지 않았다면<br />휴대폰에 웹앱을 설치해주세요.</h2>
        <p className="install-campaign-description">홈 화면에서 앱처럼 바로 열고, 새로운 기도 소식을 푸시 알림으로 받아볼 수 있어요.</p>

        <div className="install-campaign-tabs" role="tablist" aria-label="휴대폰 선택">
          <button type="button" role="tab" aria-selected={isIos} className={isIos ? "active" : ""} onClick={() => setPlatform("ios")}>iPhone</button>
          <button type="button" role="tab" aria-selected={!isIos} className={!isIos ? "active" : ""} onClick={() => setPlatform("galaxy")}>Galaxy</button>
        </div>

        <div className="install-campaign-guide">
          <Image src={isIos ? "/images/install-ios-guide.svg" : "/images/install-galaxy-guide.svg"} alt={isIos ? "iPhone Safari 홈 화면 추가와 알림 허용 안내" : "갤럭시 Chrome 및 삼성 인터넷 설치와 알림 허용 안내"} width={640} height={400} priority />
          <div className="install-campaign-steps">
            <span><Smartphone size={15} />{isIos ? "Safari 공유 메뉴에서 ‘홈 화면에 추가’" : "Chrome ‘앱 설치’ 또는 삼성 인터넷 ‘홈 화면’"}</span>
            <span><BellRing size={15} />설정 → 외부 알림 → 브라우저 푸시 ON</span>
          </div>
        </div>

        <button className="install-campaign-confirm" type="button" onClick={close}>닫기</button>
        <small className="install-campaign-expiry">이 안내는 오늘 자정까지만 표시됩니다.</small>
      </section>
    </div>,
    document.body,
  );
}
