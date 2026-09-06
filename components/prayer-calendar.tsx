"use client";

import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import type { PrayerSummary } from "@/lib/domain";
import { koreaDateKey } from "@/lib/dates";

type PrayerCalendarProps = {
  prayers: PrayerSummary[];
  todayKey: string;
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dateKey(year: number, month: number, day: number) {
  return `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
}

export function PrayerCalendar({ prayers, todayKey }: PrayerCalendarProps) {
  const [initialYear, initialMonth] = todayKey.split("-").map(Number);
  const [visibleMonth, setVisibleMonth] = useState(() => ({ year: initialYear, month: initialMonth }));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const prayersByDate = useMemo(() => {
    const grouped = new Map<string, PrayerSummary[]>();
    for (const prayer of prayers) {
      const key = koreaDateKey(new Date(prayer.createdAt));
      grouped.set(key, [...(grouped.get(key) ?? []), prayer]);
    }
    return grouped;
  }, [prayers]);
  const selectedPrayers = prayersByDate.get(selectedDate) ?? [];
  const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1)).getUTCDay();
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);

  function changeMonth(offset: number) {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1 + offset, 1));
    const year = next.getUTCFullYear();
    const month = next.getUTCMonth() + 1;
    setVisibleMonth({ year, month });
    setSelectedDate(dateKey(year, month, 1));
  }

  return (
    <section className="prayer-calendar-panel" aria-label="기도제목 등록 달력">
      <div className="prayer-calendar-heading">
        <div><span className="prayer-calendar-heading-icon"><CalendarDays size={19} /></span><div><h2>기도 기록 달력</h2><p>날짜 아래의 점 하나가 그날 등록한 기도제목 하나예요.</p></div></div>
        <div className="prayer-calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="이전 달"><ChevronLeft size={18} /></button>
          <strong>{visibleMonth.year}년 {visibleMonth.month}월</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="다음 달"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="prayer-calendar-weekdays" aria-hidden="true">
        {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="prayer-calendar-grid">
        {cells.map((day, index) => {
          if (!day) return <span className="prayer-calendar-blank" key={`blank-${index}`} />;
          const key = dateKey(visibleMonth.year, visibleMonth.month, day);
          const datePrayers = prayersByDate.get(key) ?? [];
          return (
            <button
              className={`${selectedDate === key ? "selected" : ""} ${todayKey === key ? "today" : ""}`.trim()}
              type="button"
              key={key}
              onClick={() => setSelectedDate(key)}
              aria-pressed={selectedDate === key}
              aria-label={`${visibleMonth.month}월 ${day}일, 등록한 기도제목 ${datePrayers.length}개`}
            >
              <span>{day}</span>
              <span className="prayer-calendar-dots" aria-hidden="true">
                {datePrayers.slice(0, 3).map((prayer) => <i key={prayer.id} />)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="prayer-calendar-selected">
        <div className="prayer-calendar-selected-heading">
          <strong>{Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8, 10))}일에 등록한 기도</strong>
          <span>{selectedPrayers.length}개</span>
        </div>
        <div className="prayer-calendar-selected-list">
          {selectedPrayers.map((prayer) => (
            <Link href={`/prayers/${prayer.id}`} key={prayer.id}>
              <span className={`calendar-prayer-status ${prayer.status}`} aria-label={prayer.status === "completed" ? "해결됨" : "기도 중"}>{prayer.status === "completed" ? <Check size={13} /> : <CalendarDays size={13} />}</span>
              <span className="calendar-prayer-copy"><strong>{prayer.content}</strong><small>{prayer.isPersonal ? <><LockKeyhole size={11} />개인기도</> : prayer.groupNames.join(", ") || prayer.groupName}</small></span>
              <span className={`calendar-prayer-label ${prayer.status}`}>{prayer.status === "completed" ? "해결됨" : "기도 중"}</span>
              <ChevronRight size={16} />
            </Link>
          ))}
          {selectedPrayers.length === 0 && <div className="prayer-calendar-empty"><CalendarDays size={19} /><span>이날 등록한 기도제목이 없어요.</span></div>}
        </div>
      </div>
    </section>
  );
}
