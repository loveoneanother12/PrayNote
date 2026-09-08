"use client";

import { Camera, Check, Download, Instagram, MessageCircle, Moon, Share2, Sun, X } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProfileColor } from "@/lib/domain";

type TrackerTheme = "white" | "black";
type ShareTarget = "instagram" | "kakao";

type PrayerTrackerShareProps = {
  displayName: string;
  profileColor: ProfileColor;
  currentStreak: number;
  prayedToday: boolean;
  milestone: number;
  progress: number;
};

const PROFILE_GRADIENTS: Record<ProfileColor, [string, string]> = {
  indigo: ["#8292e8", "#4f63c4"], sky: ["#7cd1ef", "#3393c4"], teal: ["#68cbbb", "#278a7e"],
  green: ["#8ad294", "#439453"], amber: ["#f1cb69", "#cf932b"], rose: ["#ef9bb1", "#c75373"],
  violet: ["#b29ae4", "#7352b5"], slate: ["#a3aebe", "#657186"], coral: ["#ffa49a", "#d85f55"],
  orange: ["#f7b36e", "#d17429"], lime: ["#bedc70", "#6f962e"], mint: ["#83dbba", "#32a078"],
  cyan: ["#76d9de", "#25949e"], blue: ["#83a8ed", "#3766bc"], navy: ["#7186ad", "#34486f"],
  grape: ["#aa88cf", "#624286"], magenta: ["#e487c9", "#ad3c8b"], red: ["#ec8585", "#b94040"],
  brown: ["#b7957f", "#735541"], charcoal: ["#7d8490", "#3a424e"], lavender: ["#dfd6fb", "#a18bdf"],
  lilac: ["#ead5f0", "#bd88c7"], blush: ["#f7d7df", "#e293a8"], peach: ["#f8d9c6", "#e6a076"],
  butter: ["#f8edbe", "#d5bd62"], sage: ["#d3dfce", "#86a57e"], aqua: ["#c9ebe6", "#64b3a9"],
  periwinkle: ["#cbd3f7", "#8293d5"],
};

function koreaDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function koreaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, size: number) {
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
}

function canvasFile(canvas: HTMLCanvasElement) {
  const [header, encoded] = canvas.toDataURL("image/png", 1).split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/png";
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], `praynote-prayer-tracker-${koreaDateKey()}.png`, { type: mime });
}

export function PrayerTrackerShare({
  displayName,
  profileColor,
  currentStreak,
  prayedToday,
  milestone,
  progress,
}: PrayerTrackerShareProps) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<TrackerTheme>("white");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<ShareTarget | "save" | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const drawTracker = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const size = 1080;
    const [start, end] = PROFILE_GRADIENTS[profileColor];
    context.clearRect(0, 0, size, size);

    if (photoUrl) {
      const image = new Image();
      image.src = photoUrl;
      await image.decode();
      drawCover(context, image, size);
      context.fillStyle = theme === "white" ? "rgba(16, 20, 31, .42)" : "rgba(255, 255, 255, .48)";
      context.fillRect(0, 0, size, size);
    } else {
      const gradient = context.createLinearGradient(80, 40, 1000, 1060);
      gradient.addColorStop(0, start);
      gradient.addColorStop(1, end);
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      context.fillStyle = theme === "white" ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.3)";
      context.beginPath();
      context.arc(930, 80, 310, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = theme === "white" ? "rgba(255,255,255,.06)" : "rgba(20,25,40,.08)";
      context.beginPath();
      context.arc(80, 1010, 400, 0, Math.PI * 2);
      context.fill();
      if (theme === "black") {
        context.fillStyle = "rgba(255,255,255,.42)";
        context.fillRect(0, 0, size, size);
      }
    }

    const ink = theme === "white" ? "#ffffff" : "#161a22";
    const muted = theme === "white" ? "rgba(255,255,255,.76)" : "rgba(22,26,34,.68)";
    const soft = theme === "white" ? "rgba(255,255,255,.18)" : "rgba(16,20,28,.14)";
    const track = theme === "white" ? "rgba(255,255,255,.22)" : "rgba(16,20,28,.17)";

    context.textBaseline = "alphabetic";
    context.fillStyle = ink;
    context.font = "800 38px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("PrayNote", 88, 112);
    context.fillStyle = muted;
    context.font = "650 24px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.textAlign = "right";
    context.fillText(koreaDateLabel(), 992, 108);
    context.textAlign = "left";

    context.fillStyle = soft;
    roundedRect(context, 86, 260, 908, 560, 42);
    context.fill();

    context.fillStyle = muted;
    context.font = "700 27px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("나의 연속 기도 기록", 142, 340);
    context.fillStyle = ink;
    context.font = "800 118px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText(currentStreak > 0 ? `${currentStreak}일째` : "오늘부터", 142, 500);
    context.font = "750 55px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText(currentStreak > 0 ? "기도 중이에요!" : "기도를 시작해요", 146, 575);

    context.fillStyle = track;
    roundedRect(context, 142, 654, 796, 18, 9);
    context.fill();
    if (progress > 0) {
      const progressWidth = Math.max(18, 796 * Math.min(100, progress) / 100);
      context.fillStyle = ink;
      roundedRect(context, 142, 654, progressWidth, 18, 9);
      context.fill();
    }
    context.fillStyle = muted;
    context.font = "650 23px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText(prayedToday ? "오늘의 기도 완료" : "오늘의 기도를 기다리고 있어요", 142, 724);
    context.textAlign = "right";
    context.fillText(`다음 목표 ${milestone}일`, 938, 724);
    context.textAlign = "left";

    context.fillStyle = ink;
    context.font = "700 30px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText(`${displayName}님의 기도 기록`, 88, 958);
    context.fillStyle = muted;
    context.font = "550 22px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";
    context.fillText("오늘도 기도로 마음을 이어가요.", 88, 1003);
  }, [currentStreak, displayName, milestone, photoUrl, prayedToday, profileColor, progress, theme]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const drawWhenReady = async () => {
      if (cancelled) return;
      try {
        await drawTracker();
        if (!cancelled) setPreviewReady(true);
      } catch {
        if (!cancelled) {
          setPreviewReady(false);
          setMessage("이미지 미리보기를 만들지 못했어요. 다른 사진을 선택해주세요.");
        }
      }
    };
    document.fonts.ready.then(drawWhenReady).catch(drawWhenReady);
    return () => { cancelled = true; };
  }, [drawTracker, open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("사진 파일만 사용할 수 있어요.");
      return;
    }
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPreviewReady(false);
    setMessage("촬영한 사진을 배경으로 적용했어요.");
    event.target.value = "";
  };

  const trackerFile = () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("canvas-missing");
    return canvasFile(canvas);
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const share = async (target: ShareTarget) => {
    if (busy) return;
    setBusy(target);
    setMessage("");
    try {
      const file = trackerFile();
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          files: [file],
          title: `${displayName}님의 PrayNote 기도 기록`,
          text: target === "instagram" ? "공유창에서 Instagram 스토리를 선택해주세요." : "공유창에서 카카오톡과 채팅방을 선택해주세요.",
        });
        setMessage(target === "instagram" ? "인스타그램 공유창으로 이미지를 보냈어요." : "카카오톡 공유창으로 이미지를 보냈어요.");
      } else {
        downloadFile(file);
        setMessage("이 기기에서는 앱으로 바로 보낼 수 없어 이미지를 저장했어요. 해당 앱에서 불러와주세요.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("이미지를 공유하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (busy) return;
    setBusy("save");
    setMessage("");
    try {
      const file = trackerFile();
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isIos && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: `${displayName}님의 PrayNote 기도 기록` });
        setMessage("공유창에서 ‘이미지 저장’을 선택하면 사진 앱에 저장돼요.");
      } else {
        downloadFile(file);
        setMessage("기도 트래커 이미지를 저장했어요.");
      }
    } catch {
      setMessage("이미지를 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button className="prayer-streak-share-button" type="button" onClick={() => { setPreviewReady(false); setOpen(true); }}><Share2 size={12} />공유</button>
      {open && createPortal(
        <div className="modal-backdrop tracker-share-backdrop" role="presentation" onMouseDown={() => !busy && setOpen(false)}>
          <section className="composer-modal tracker-share-modal" role="dialog" aria-modal="true" aria-labelledby="tracker-share-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div><span>PRAYER TRACKER</span><h2 id="tracker-share-title">기도 기록 공유하기</h2></div>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)} disabled={Boolean(busy)}><X size={19} /></button>
            </div>

            <p className="tracker-share-intro">나의 연속 기도 기록을 정방형 이미지로 만들었어요. 사진과 글자 색을 원하는 모습으로 바꿔보세요.</p>

            <div className="tracker-preview-frame">
              <canvas ref={canvasRef} width={1080} height={1080} aria-label="공유할 정방형 기도 트래커 이미지 미리보기" />
            </div>

            <div className="tracker-customize-row">
              <div className="tracker-theme-toggle" role="group" aria-label="글자 테마 선택">
                <button type="button" className={theme === "white" ? "active" : ""} onClick={() => { if (theme !== "white") { setPreviewReady(false); setTheme("white"); } }}><Sun size={14} />화이트{theme === "white" && <Check size={12} />}</button>
                <button type="button" className={theme === "black" ? "active" : ""} onClick={() => { if (theme !== "black") { setPreviewReady(false); setTheme("black"); } }}><Moon size={14} />블랙{theme === "black" && <Check size={12} />}</button>
              </div>
              {photoUrl && <button className="tracker-photo-remove" type="button" onClick={() => { setPreviewReady(false); setPhotoUrl(null); }}>기본 배경으로</button>}
            </div>

            <input ref={fileInputRef} className="tracker-camera-input" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
            <button className="tracker-camera-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(busy)}><Camera size={17} />{photoUrl ? "사진 다시 찍기" : "사진 찍기"}</button>

            <div className="tracker-share-actions">
              <button type="button" className="instagram" onClick={() => share("instagram")} disabled={Boolean(busy) || !previewReady} aria-busy={busy === "instagram"}><Instagram size={18} /><span>{busy === "instagram" ? "준비 중…" : "인스타그램"}</span></button>
              <button type="button" className="kakao" onClick={() => share("kakao")} disabled={Boolean(busy) || !previewReady} aria-busy={busy === "kakao"}><MessageCircle size={18} /><span>{busy === "kakao" ? "준비 중…" : "카카오톡"}</span></button>
              <button type="button" className="save" onClick={save} disabled={Boolean(busy) || !previewReady} aria-busy={busy === "save"}><Download size={18} /><span>{busy === "save" ? "저장 중…" : "이미지 저장"}</span></button>
            </div>
            <p className="tracker-share-help">인스타그램·카카오톡 버튼을 누르면 기기의 공유창이 열립니다. 공유할 앱과 스토리 또는 채팅방을 선택해주세요.</p>
            {message && <p className="tracker-share-message" role="status">{message}</p>}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
