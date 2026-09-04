import Link from "next/link";
import { CalendarDays, Check, Heart, RotateCcw } from "lucide-react";
import { togglePrayerCompleted, toggleTodayPrayer } from "@/app/prayer-actions";
import { formatKoreaDate } from "@/lib/dates";
import type { PrayerSummary } from "@/lib/domain";

type PrayerRecordCardProps = {
  prayer: PrayerSummary;
  currentUserId: string;
  returnTo: string;
  showGroup?: boolean;
};

export function PrayerRecordCard({ prayer, currentUserId, returnTo, showGroup = false }: PrayerRecordCardProps) {
  const mine = prayer.authorId === currentUserId;
  const completed = prayer.status === "completed";

  return (
    <article className={`record-card ${completed ? "resolved" : ""}`}>
      <div className="record-card-head">
        <div className="avatar avatar-1">{prayer.authorName.slice(0, 2)}</div>
        <div>
          <strong>{mine ? "나" : prayer.authorName}</strong>
          <span><CalendarDays size={13} />{formatKoreaDate(prayer.createdAt)} 등록{showGroup ? ` · ${prayer.groupName}` : ""}</span>
        </div>
        {completed && <em><Check size={14} />해결됨</em>}
      </div>
      <Link className="record-content-link" href={`/prayers/${prayer.id}`}>
        <p>{prayer.content}</p>
        <span>자세히 보기</span>
      </Link>
      {completed && prayer.completedAt && (
        <div className="resolved-date"><Check size={14} />{formatKoreaDate(prayer.completedAt)}에 해결된 기도제목으로 이관됨</div>
      )}
      <div className="record-actions">
        {!completed && (
          <form action={toggleTodayPrayer}>
            <input type="hidden" name="prayerId" value={prayer.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className={`daily-prayer-button ${prayer.hasPrayed ? "done" : ""}`} type="submit" title={prayer.hasPrayed ? "다시 누르면 오늘 기록이 취소됩니다." : "한국시간 기준 오늘의 기도 기록을 남깁니다."}>
              {prayer.hasPrayed ? <Check size={16} /> : <Heart size={16} />}
              {prayer.hasPrayed ? "오늘 기도완료" : "오늘 기도하기"}
              <span>누적 {prayer.responseCount}회</span>
            </button>
          </form>
        )}
        {mine && (
          <form action={togglePrayerCompleted} className="resolve-form">
            <input type="hidden" name="prayerId" value={prayer.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="status" value={completed ? "active" : "completed"} />
            <button className="resolve-button" type="submit">
              {completed ? <RotateCcw size={15} /> : <Check size={15} />}
              {completed ? "진행 중으로 되돌리기" : "해결 완료"}
            </button>
          </form>
        )}
      </div>
      {prayer.hasPrayed && !completed && <span className="daily-undo-hint">다시 누르면 오늘의 기도 기록을 취소할 수 있어요.</span>}
    </article>
  );
}
