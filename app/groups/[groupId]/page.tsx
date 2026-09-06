import Link from "next/link";
import { ArrowLeft, CalendarCheck, Settings, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CopyInviteButton } from "@/components/copy-invite-button";
import { GroupPrayerComposer } from "@/components/group-prayer-composer";
import { MobileNav } from "@/components/mobile-nav";
import { PrayerRecordSections } from "@/components/prayer-record-sections";
import { SharePrayerModal } from "@/components/share-prayer-modal";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaToday } from "@/lib/dates";
import { getGroupPageBundle } from "@/lib/group-queries";
import { createClient } from "@/lib/supabase/server";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ created?: string; updated?: string; deleted?: string; shared?: string; error?: string; view?: string; share?: string; prayerId?: string }>;
};

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const [{ groupId }, queryParams] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const bundle = await getGroupPageBundle(supabase, groupId);
  if (!bundle) redirect("/login");
  if (!bundle.overview) notFound();
  const { overview, prayers } = bundle;
  const { group, role, memberCount, myGroups } = overview;

  const displayName = (overview.displayName ?? bundle.email.split("@")[0]) || "기도하는 이";
  const returnTo = `/groups/${groupId}`;
  const view = queryParams.view === "resolved" || queryParams.view === "all" ? queryParams.view : "active";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} profileColor={overview.profileColor} active="groups" />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <Link className="back-link" href="/dashboard"><ArrowLeft size={18} />대시보드</Link>
          <span className="today-pill"><CalendarCheck size={16} />{formatKoreaToday()}</span>
        </header>
        <div className="content-wrap detail-content">
          <section className="group-hero">
            <div>
              <span className="role-label hero-role">{role.toUpperCase()}</span>
              <h1>{group.name}</h1>
              <p>{group.description || "함께 마음을 나누고 기도하는 공간이에요."}</p>
              <span className="member-summary"><Users size={15} />멤버 {memberCount}명</span>
            </div>
            <div className="invite-code-box">
              <span>그룹 초대코드</span>
              <strong>{group.invite_code}</strong>
              <CopyInviteButton code={group.invite_code} groupId={group.id} />
            </div>
          </section>

          <div className="group-toolbar">
            <span>역할: {role === "leader" ? "리더" : role === "admin" ? "관리자" : "멤버"}</span>
            <Link className="outline-button" href={`/groups/${groupId}/manage`}><Settings size={16} />그룹 관리</Link>
          </div>

          <GroupPrayerComposer currentGroup={{ id: group.id, name: group.name }} groups={myGroups} />

          {(queryParams.created || queryParams.updated || queryParams.deleted || queryParams.shared || queryParams.error) && (
            <div className={`page-notice ${queryParams.error ? "error" : ""}`}>
              {queryParams.shared ? "선택한 그룹에도 기도제목을 공유했어요." : queryParams.created ? "기도제목이 등록됐어요." : queryParams.deleted ? "기도제목을 삭제했어요." : queryParams.updated === "completed" ? "해결된 기도제목으로 이관했어요." : queryParams.updated === "active" ? "진행 중 기도로 되돌렸어요." : "요청을 처리하지 못했어요."}
            </div>
          )}

          <PrayerRecordSections prayers={prayers} currentUserId={bundle.userId} groups={myGroups} scope="group" initialView={view} />
        </div>
      </main>
      <MobileNav active="groups" />
      {queryParams.share === "1" && queryParams.prayerId && /^[0-9a-f-]{36}$/i.test(queryParams.prayerId) && (
        <SharePrayerModal prayerId={queryParams.prayerId} currentGroup={{ id: group.id, name: group.name }} groups={myGroups} returnTo={returnTo} />
      )}
    </div>
  );
}
