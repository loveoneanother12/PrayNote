import Link from "next/link";
import { ArrowLeft, BookHeart, CalendarCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { PrayerRecordSections } from "@/components/prayer-record-sections";
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
      <SubpageNav displayName={displayName} profileColor={bundle.profileColor} active="prayers" />
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

          <PrayerRecordSections prayers={prayers} currentUserId={bundle.userId} groups={bundle.myGroups} scope="mine" initialView={view} />
        </div>
      </main>
      <MobileNav active="prayers" />
    </div>
  );
}
