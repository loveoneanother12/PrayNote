"use client";

import { Flame, Pencil, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleIdentitySettings } from "@/components/google-identity-settings";
import { InstantProfileForm } from "@/components/instant-settings-forms";
import { ProfileDot } from "@/components/profile-dot";
import type { ProfileColor } from "@/lib/domain";

type MyProfileCardProps = {
  userId: string;
  displayName: string;
  email: string;
  profileColor: ProfileColor;
  activePrayerCount: number;
  resolvedPrayerCount: number;
  currentStreak: number;
  prayedToday: boolean;
};

function streakCopy(currentStreak: number, prayedToday: boolean) {
  if (currentStreak === 0) {
    return {
      title: "오늘, 기도의 첫걸음을 시작해보세요",
      description: "한 번의 기도가 내일의 좋은 리듬을 만들어요.",
    };
  }

  return {
    title: `${currentStreak}일째 기도 중이에요!`,
    description: prayedToday
      ? "오늘의 기도도 이어졌어요. 작은 꾸준함을 함께 응원할게요."
      : `오늘 기도하면 ${currentStreak + 1}일째 기록이 이어져요.`,
  };
}

function nextMilestone(currentStreak: number) {
  if (currentStreak < 7) return 7;
  return Math.ceil((currentStreak + 1) / 7) * 7;
}

export function MyProfileCard({
  userId,
  displayName,
  email,
  profileColor,
  activePrayerCount,
  resolvedPrayerCount,
  currentStreak,
  prayedToday,
}: MyProfileCardProps) {
  const [open, setOpen] = useState(false);
  const copy = streakCopy(currentStreak, prayedToday);
  const milestone = nextMilestone(currentStreak);
  const progress = useMemo(() => Math.min(100, Math.round((currentStreak / milestone) * 100)), [currentStreak, milestone]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <section className="my-profile-card" aria-labelledby="my-profile-title">
      <div className="my-profile-summary">
        <ProfileDot color={profileColor} label={displayName} size="large" />
        <div className="my-profile-identity">
          <span>내 프로필</span>
          <h1 id="my-profile-title">{displayName}</h1>
          <p>{email}</p>
        </div>
        <button className="profile-edit-button" type="button" onClick={() => setOpen(true)}>
          <Pencil size={14} />프로필 수정
        </button>
        <div className="my-prayer-mini-stats" aria-label="내 기도제목 현황">
          <span><strong>{activePrayerCount}</strong> 기도 중</span>
          <i aria-hidden="true" />
          <span><strong>{resolvedPrayerCount}</strong> 해결됨</span>
        </div>
      </div>

      <div className={`prayer-streak-strip ${prayedToday ? "complete" : ""}`}>
        <span className="prayer-streak-icon"><Flame size={19} /></span>
        <div className="prayer-streak-content">
          <div className="prayer-streak-copy">
            <div><Sparkles size={13} /><strong>{copy.title}</strong></div>
            <span>{copy.description}</span>
          </div>
          <div className="prayer-streak-progress" role="progressbar" aria-label={`${milestone}일 기도 목표`} aria-valuemin={0} aria-valuemax={milestone} aria-valuenow={currentStreak}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="prayer-streak-meta"><span>{prayedToday ? "오늘 기도 완료" : "오늘의 기도를 기다리고 있어요"}</span><strong>다음 목표 {milestone}일</strong></div>
        </div>
      </div>

      {open && createPortal(
        <div className="modal-backdrop profile-edit-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="composer-modal profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div><span>MY PROFILE</span><h2 id="profile-edit-title">프로필 수정</h2></div>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)}><X size={19} /></button>
            </div>
            <p className="profile-edit-intro">그룹 멤버들에게 보이는 이름과 색, 로그인 수단을 관리할 수 있어요.</p>
            <InstantProfileForm userId={userId} displayName={displayName} email={email} initialColor={profileColor} />
            <GoogleIdentitySettings returnTo="/prayers" />
          </section>
        </div>,
        document.body,
      )}
    </section>
  );
}
