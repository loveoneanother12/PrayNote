import Link from "next/link";
import { ArrowLeft, BookHeart, CalendarCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { PrayerRecordCard } from "@/components/prayer-record-card";
import { MobileNav } from "@/components/mobile-nav";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaToday } from "@/lib/dates";
import { getMyPrayersPageBundle } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type MyPrayersPageProps = {
  searchParams: Promise<{ updated?: string; deleted?: string; error?: string; view?: string }>;
};

export default async function MyPrayersPage({ searchParams }: MyPrayersPageProps) {
  const supabase = await createClient();
  const [bundle, queryParams] = await Promise.all([getMyPrayersPageBundle(supabase), searchParams]);
  if (!bundle) redirect("/login");
  const { prayers } = bundle;

  const activePrayers = prayers.filter((prayer) => prayer.status === "active");
  const resolvedPrayers = prayers.filter((prayer) => prayer.status === "completed");
  const displayName = (bundle.displayName ?? bundle.email.split("@")[0]) || "기도하는 이";
  const view = queryParams.view === "resolved" || queryParams.view === "all" ? queryParams.view : "active";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active="prayers" />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <Link className="back-link" href="/dashboard"><ArrowLeft size={18} />대시보드</Link>
          <span className="today-pill"><CalendarCheck size={16} />{formatKoreaToday()}</span>
        </header>
        <div className="content-wrap detail-content">
          <section className="my-prayers-hero">
            <span className="overview-icon"><BookHeart size={22} /></span>
            <div><p>나의 기도 여정</p><h1>내 기도제목</h1><span>등록한 날부터 해결된 날까지, 기도의 시간을 기억해요.</span></div>
            <div className="prayer-stats"><div><strong>{activePrayers.length}</strong><span>기도 중</span></div><div><strong>{resolvedPrayers.length}</strong><span>해결됨</span></div></div>
          </section>

          {(queryParams.updated || queryParams.deleted || queryParams.error) && <div className={`page-notice ${queryParams.error ? "error" : ""}`}>{queryParams.error ? "요청을 처리하지 못했어요." : queryParams.deleted ? "기도제목을 삭제했어요." : queryParams.updated === "completed" ? "해결된 기도제목으로 이관했어요." : "진행 중 기도로 되돌렸어요."}</div>}

          <nav className="prayer-filter-tabs" aria-label="내 기도제목 상태 필터">
            <Link className={view === "active" ? "active" : ""} href="/prayers">기도 중 <span>{activePrayers.length}</span></Link>
            <Link className={view === "resolved" ? "active" : ""} href="/prayers?view=resolved">해결됨 <span>{resolvedPrayers.length}</span></Link>
            <Link className={view === "all" ? "active" : ""} href="/prayers?view=all">전체 <span>{prayers.length}</span></Link>
          </nav>

          {(view === "active" || view === "all") && <section className="prayer-record-section">
            <div className="record-section-heading"><div><span className="status-dot active" /><h2>진행 중인 기도제목</h2></div><strong>{activePrayers.length}</strong></div>
            <div className="record-grid">
              {activePrayers.map((prayer) => <PrayerRecordCard key={prayer.id} prayer={prayer} currentUserId={bundle.userId} returnTo="/prayers" showGroup />)}
              {activePrayers.length === 0 && <div className="empty-records"><BookHeart size={25} /><strong>진행 중인 내 기도가 없어요</strong><span>메인 화면에서 개인기도나 그룹 기도제목을 등록해보세요.</span></div>}
            </div>
          </section>}

          {(view === "resolved" || view === "all") && <section className="prayer-record-section resolved-section">
            <div className="record-section-heading"><div><span className="status-dot resolved" /><h2>해결된 기도제목들</h2></div><strong>{resolvedPrayers.length}</strong></div>
            <p className="section-description">해결 완료 버튼을 누른 기록이 날짜순으로 쌓입니다. 이 기록은 이후 기도 타임라인에도 사용됩니다.</p>
            <div className="record-grid">
              {resolvedPrayers.map((prayer) => <PrayerRecordCard key={prayer.id} prayer={prayer} currentUserId={bundle.userId} returnTo="/prayers" showGroup />)}
              {resolvedPrayers.length === 0 && <div className="empty-records compact"><CalendarCheck size={24} /><strong>아직 해결 기록이 없어요</strong></div>}
            </div>
          </section>}
        </div>
      </main>
      <MobileNav active="prayers" />
    </div>
  );
}
