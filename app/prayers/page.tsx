import Link from "next/link";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { MyProfileCard } from "@/components/my-profile-card";
import { PrayerRecordSections } from "@/components/prayer-record-sections";
import { PrayerCalendar } from "@/components/prayer-calendar";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaToday, koreaDateKey } from "@/lib/dates";
import { getMyPrayersPageBundle } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type MyPrayersPageProps = {
  searchParams: Promise<{ updated?: string; deleted?: string; error?: string; linked?: string; view?: string }>;
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
          <MyProfileCard
            userId={bundle.userId}
            displayName={displayName}
            email={bundle.email}
            profileColor={bundle.profileColor}
            activePrayerCount={activePrayers.length}
            resolvedPrayerCount={resolvedPrayers.length}
            currentStreak={bundle.prayerRhythm.currentStreak}
            prayedToday={bundle.prayerRhythm.prayedToday}
          />

          {queryParams.linked === "google" && <div className="page-notice">Google 계정을 연결했어요. 이제 Google로도 로그인할 수 있습니다.</div>}

          <PrayerCalendar prayers={prayers} todayKey={koreaDateKey()} />

          {(queryParams.updated || queryParams.deleted || queryParams.error) && <div className={`page-notice ${queryParams.error ? "error" : ""}`}>{queryParams.error === "google-link-failed" ? "Google 계정을 연결하지 못했어요. 이미 다른 PrayNote 계정에서 사용 중인지 확인해주세요." : queryParams.error ? "요청을 처리하지 못했어요." : queryParams.deleted ? "기도제목을 삭제했어요." : queryParams.updated === "completed" ? "해결된 기도제목으로 이관했어요." : "진행 중 기도로 되돌렸어요."}</div>}

          <PrayerRecordSections prayers={prayers} currentUserId={bundle.userId} groups={bundle.myGroups} scope="mine" initialView={view} />
        </div>
      </main>
      <MobileNav active="prayers" />
    </div>
  );
}
