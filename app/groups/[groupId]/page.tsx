import Link from "next/link";
import { ArrowLeft, BookHeart, CalendarCheck, Plus, Settings, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createPrayer } from "@/app/prayer-actions";
import { CopyInviteButton } from "@/components/copy-invite-button";
import { MobileNav } from "@/components/mobile-nav";
import { PrayerRecordCard } from "@/components/prayer-record-card";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaToday } from "@/lib/dates";
import { getPrayerSummaries } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ created?: string; updated?: string; deleted?: string; error?: string; view?: string }>;
};

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const [{ groupId }, queryParams] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const [{ data: profile }, { data: membership }, { data: group }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userData.user.id).single(),
    supabase.from("group_memberships").select("role").eq("group_id", groupId).eq("user_id", userData.user.id).eq("status", "active").maybeSingle(),
    supabase.from("groups").select("id, name, description, invite_code").eq("id", groupId).is("deleted_at", null).maybeSingle(),
  ]);

  if (!membership || !group) notFound();

  const [{ count: memberCount }, prayers] = await Promise.all([
    supabase.from("group_memberships").select("id", { count: "exact", head: true }).eq("group_id", groupId).eq("status", "active"),
    getPrayerSummaries(supabase, userData.user.id, { groupIds: [groupId] }),
  ]);

  const activePrayers = prayers.filter((prayer) => prayer.status === "active");
  const resolvedPrayers = prayers.filter((prayer) => prayer.status === "completed");
  const displayName = profile?.display_name ?? userData.user.email?.split("@")[0] ?? "기도하는 이";
  const returnTo = `/groups/${groupId}`;
  const view = queryParams.view === "resolved" || queryParams.view === "all" ? queryParams.view : "active";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active="groups" />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <Link className="back-link" href="/dashboard"><ArrowLeft size={18} />대시보드</Link>
          <span className="today-pill"><CalendarCheck size={16} />{formatKoreaToday()}</span>
        </header>
        <div className="content-wrap detail-content">
          <section className="group-hero">
            <div>
              <span className="role-label hero-role">{membership.role.toUpperCase()}</span>
              <h1>{group.name}</h1>
              <p>{group.description || "함께 마음을 나누고 기도하는 공간이에요."}</p>
              <span className="member-summary"><Users size={15} />멤버 {memberCount ?? 0}명</span>
            </div>
            <div className="invite-code-box">
              <span>그룹 초대코드</span>
              <strong>{group.invite_code}</strong>
              <CopyInviteButton code={group.invite_code} groupId={group.id} />
            </div>
          </section>

          <div className="group-toolbar">
            <span>역할: {membership.role === "leader" ? "리더" : membership.role === "admin" ? "관리자" : "멤버"}</span>
            <Link className="outline-button" href={`/groups/${groupId}/manage`}><Settings size={16} />그룹 관리</Link>
          </div>

          <section className="inline-composer">
            <div className="inline-composer-icon"><BookHeart size={22} /></div>
            <form action={createPrayer}>
              <input type="hidden" name="groupId" value={groupId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="sr-only" htmlFor="group-prayer-content">기도제목</label>
              <textarea id="group-prayer-content" name="content" maxLength={2000} required placeholder="함께 기도받고 싶은 내용을 적어주세요." />
              <div><span>등록 날짜는 한국시간 기준으로 자동 저장돼요.</span><button className="primary-button" type="submit"><Plus size={17} />기도제목 등록</button></div>
            </form>
          </section>

          {(queryParams.created || queryParams.updated || queryParams.deleted || queryParams.error) && (
            <div className={`page-notice ${queryParams.error ? "error" : ""}`}>
              {queryParams.created ? "기도제목이 등록됐어요." : queryParams.deleted ? "기도제목을 삭제했어요." : queryParams.updated === "completed" ? "해결된 기도제목으로 이관했어요." : queryParams.updated === "active" ? "진행 중 기도로 되돌렸어요." : "요청을 처리하지 못했어요."}
            </div>
          )}

          <nav className="prayer-filter-tabs" aria-label="기도제목 상태 필터">
            <Link className={view === "active" ? "active" : ""} href={returnTo}>기도 중 <span>{activePrayers.length}</span></Link>
            <Link className={view === "resolved" ? "active" : ""} href={`${returnTo}?view=resolved`}>해결됨 <span>{resolvedPrayers.length}</span></Link>
            <Link className={view === "all" ? "active" : ""} href={`${returnTo}?view=all`}>전체 <span>{prayers.length}</span></Link>
          </nav>

          {(view === "active" || view === "all") && <section className="prayer-record-section">
            <div className="record-section-heading"><div><span className="status-dot active" /><h2>함께 기도 중</h2></div><strong>{activePrayers.length}</strong></div>
            <div className="record-grid">
              {activePrayers.map((prayer) => <PrayerRecordCard key={prayer.id} prayer={prayer} currentUserId={userData.user.id} returnTo={returnTo} />)}
              {activePrayers.length === 0 && <div className="empty-records"><BookHeart size={25} /><strong>진행 중인 기도제목이 없어요</strong><span>위 입력창에서 첫 기도제목을 나눠보세요.</span></div>}
            </div>
          </section>}

          {(view === "resolved" || view === "all") && <section className="prayer-record-section resolved-section">
            <div className="record-section-heading"><div><span className="status-dot resolved" /><h2>해결된 기도제목들</h2></div><strong>{resolvedPrayers.length}</strong></div>
            <p className="section-description">완료한 기도제목이 해결 날짜와 함께 차곡차곡 보관됩니다.</p>
            <div className="record-grid">
              {resolvedPrayers.map((prayer) => <PrayerRecordCard key={prayer.id} prayer={prayer} currentUserId={userData.user.id} returnTo={returnTo} />)}
              {resolvedPrayers.length === 0 && <div className="empty-records compact"><CalendarCheck size={24} /><strong>아직 해결 기록이 없어요</strong></div>}
            </div>
          </section>}
        </div>
      </main>
      <MobileNav active="groups" />
    </div>
  );
}
