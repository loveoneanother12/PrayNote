"use client";

import { BookHeart, CalendarCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { PrayerRecordCard } from "@/components/prayer-record-card";
import type { PrayerStatus, PrayerSummary } from "@/lib/domain";

type PrayerView = "active" | "resolved" | "all";
type StatusOverride = { status: PrayerStatus; completedAt: string | null };

export function PrayerRecordSections({
  prayers,
  currentUserId,
  groups,
  scope,
  initialView = "active",
}: {
  prayers: PrayerSummary[];
  currentUserId: string;
  groups: Array<{ id: string; name: string }>;
  scope: "mine" | "group";
  initialView?: PrayerView;
}) {
  const [view, setView] = useState<PrayerView>(initialView);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, StatusOverride>>({});
  const effectivePrayers = useMemo(
    () => prayers.map((prayer) => ({ ...prayer, ...(statusOverrides[prayer.id] ?? {}) })),
    [prayers, statusOverrides],
  );
  const activePrayers = useMemo(() => effectivePrayers.filter((prayer) => prayer.status === "active"), [effectivePrayers]);
  const resolvedPrayers = useMemo(() => effectivePrayers.filter((prayer) => prayer.status === "completed"), [effectivePrayers]);
  const returnTo = scope === "mine" ? "/prayers" : undefined;

  function updateStatus(prayerId: string, status: PrayerStatus, completedAt: string | null) {
    setStatusOverrides((current) => ({ ...current, [prayerId]: { status, completedAt } }));
  }

  return (
    <>
      <nav className="prayer-filter-tabs" aria-label={scope === "mine" ? "내 기도제목 상태 필터" : "기도제목 상태 필터"}>
        <button className={view === "active" ? "active" : ""} type="button" onClick={() => setView("active")}>기도 중 <span>{activePrayers.length}</span></button>
        <button className={view === "resolved" ? "active" : ""} type="button" onClick={() => setView("resolved")}>해결됨 <span>{resolvedPrayers.length}</span></button>
        <button className={view === "all" ? "active" : ""} type="button" onClick={() => setView("all")}>전체 <span>{effectivePrayers.length}</span></button>
      </nav>

      {(view === "active" || view === "all") && <section className="prayer-record-section">
        <div className="record-section-heading"><div><span className="status-dot active" /><h2>{scope === "mine" ? "진행 중인 기도제목" : "함께 기도 중"}</h2></div><strong>{activePrayers.length}</strong></div>
        <div className="record-grid">
          {activePrayers.map((prayer) => (
            <PrayerRecordCard
              key={prayer.id}
              prayer={prayer}
              currentUserId={currentUserId}
              returnTo={returnTo ?? `/groups/${prayer.groupId}`}
              showGroup={scope === "mine"}
              groups={groups}
              status={prayer.status}
              completedAt={prayer.completedAt}
              onStatusChange={(status, completedAt) => updateStatus(prayer.id, status, completedAt)}
            />
          ))}
          {activePrayers.length === 0 && <div className="empty-records"><BookHeart size={25} /><strong>{scope === "mine" ? "진행 중인 내 기도가 없어요" : "진행 중인 기도제목이 없어요"}</strong><span>{scope === "mine" ? "메인 화면에서 개인기도나 그룹 기도제목을 등록해보세요." : "위 입력창에서 첫 기도제목을 나눠보세요."}</span></div>}
        </div>
      </section>}

      {(view === "resolved" || view === "all") && <section className="prayer-record-section resolved-section">
        <div className="record-section-heading"><div><span className="status-dot resolved" /><h2>해결된 기도제목들</h2></div><strong>{resolvedPrayers.length}</strong></div>
        <p className="section-description">{scope === "mine" ? "해결 완료 버튼을 누른 기록이 날짜순으로 쌓입니다. 이 기록은 이후 기도 타임라인에도 사용됩니다." : "완료한 기도제목이 해결 날짜와 함께 차곡차곡 보관됩니다."}</p>
        <div className="record-grid">
          {resolvedPrayers.map((prayer) => (
            <PrayerRecordCard
              key={prayer.id}
              prayer={prayer}
              currentUserId={currentUserId}
              returnTo={returnTo ?? `/groups/${prayer.groupId}`}
              showGroup={scope === "mine"}
              groups={groups}
              status={prayer.status}
              completedAt={prayer.completedAt}
              onStatusChange={(status, completedAt) => updateStatus(prayer.id, status, completedAt)}
            />
          ))}
          {resolvedPrayers.length === 0 && <div className="empty-records compact"><CalendarCheck size={24} /><strong>아직 해결 기록이 없어요</strong></div>}
        </div>
      </section>}
    </>
  );
}
