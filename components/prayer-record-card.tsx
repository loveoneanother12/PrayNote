"use client";

import Link from "next/link";
import { CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import { InstantPrayerButton, InstantPrayerStatusButton } from "@/components/instant-prayer-actions";
import { PrayerOwnerActions } from "@/components/prayer-owner-actions";
import { ProfileDot } from "@/components/profile-dot";
import { formatKoreaDate } from "@/lib/dates";
import type { PrayerStatus, PrayerSummary } from "@/lib/domain";

type PrayerRecordCardProps = {
  prayer: PrayerSummary;
  currentUserId: string;
  returnTo: string;
  showGroup?: boolean;
  groups?: Array<{ id: string; name: string }>;
  status?: PrayerStatus;
  completedAt?: string | null;
  onStatusChange?: (status: PrayerStatus, completedAt: string | null) => void;
};

export function PrayerRecordCard({ prayer, currentUserId, showGroup = false, groups = [], status: controlledStatus, completedAt: controlledCompletedAt, onStatusChange }: PrayerRecordCardProps) {
  const mine = prayer.authorId === currentUserId;
  const [localStatus, setLocalStatus] = useState<PrayerStatus>(prayer.status);
  const [localCompletedAt, setLocalCompletedAt] = useState(prayer.completedAt);
  const [content, setContent] = useState(prayer.content);
  const status = controlledStatus ?? localStatus;
  const completedAt = controlledCompletedAt === undefined ? localCompletedAt : controlledCompletedAt;
  const completed = status === "completed";

  return (
    <article className={`record-card ${completed ? "resolved" : ""}`}>
      <div className="record-card-head">
        <ProfileDot color={prayer.authorColor} label={prayer.authorName} />
        <div>
          <strong>{mine ? "나" : prayer.authorName}</strong>
          <span><CalendarDays size={13} />{formatKoreaDate(prayer.createdAt)} 등록{showGroup ? ` · ${prayer.groupName}` : ""}</span>
        </div>
        {mine && <PrayerOwnerActions prayerId={prayer.id} initialContent={content} initialSharedGroups={prayer.groupIds.map((id, index) => ({ id, name: prayer.groupNames[index] ?? "공유 그룹" }))} groups={groups} onContentChange={setContent} compact />}
        {completed && <em><Check size={14} />해결됨</em>}
      </div>
      <Link className="record-content-link" href={`/prayers/${prayer.id}`}>
        <p>{content}</p>
        <span>자세히 보기</span>
      </Link>
      {completed && completedAt && (
        <div className="resolved-date"><Check size={14} />{formatKoreaDate(completedAt)}에 해결된 기도제목으로 이관됨</div>
      )}
      <div className="record-actions">
        {!completed && (
          <InstantPrayerButton prayerId={prayer.id} initialHasPrayed={prayer.hasPrayed} initialResponseCount={prayer.responseCount} className="daily-prayer-button" countPrefix="누적 " />
        )}
        {mine && (
          <div className="resolve-form">
            <InstantPrayerStatusButton
              prayerId={prayer.id}
              initialStatus={prayer.status}
              initialCompletedAt={prayer.completedAt}
              status={status}
              className="resolve-button"
              onStatusChange={(nextStatus, nextCompletedAt) => {
                setLocalStatus(nextStatus);
                setLocalCompletedAt(nextCompletedAt);
                onStatusChange?.(nextStatus, nextCompletedAt);
              }}
            />
          </div>
        )}
      </div>
      {prayer.hasPrayed && !completed && <span className="daily-undo-hint">다시 누르면 오늘의 기도 기록을 취소할 수 있어요.</span>}
    </article>
  );
}
