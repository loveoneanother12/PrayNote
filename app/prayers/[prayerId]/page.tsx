import Link from "next/link";
import { ArrowLeft, BookHeart, CalendarDays, Check, Trash2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { deletePrayer } from "@/app/prayer-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { InstantPrayerButton, InstantPrayerStatusButton } from "@/components/instant-prayer-actions";
import { MobileNav } from "@/components/mobile-nav";
import { PrayerDetailContent } from "@/components/prayer-detail-content";
import { ProfileDot } from "@/components/profile-dot";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaDate } from "@/lib/dates";
import { getPrayerDetailPageBundle } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type PrayerDetailPageProps = {
  params: Promise<{ prayerId: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
};

export default async function PrayerDetailPage({ params, searchParams }: PrayerDetailPageProps) {
  const [{ prayerId }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(prayerId)) notFound();

  const supabase = await createClient();
  const bundle = await getPrayerDetailPageBundle(supabase, prayerId);
  if (!bundle) redirect("/login");
  const prayer = bundle.prayer;
  if (!prayer) notFound();

  const mine = prayer.authorId === bundle.userId;
  const completed = prayer.status === "completed";
  const displayName = (bundle.displayName ?? bundle.email.split("@")[0]) || "기도하는 이";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} profileColor={bundle.profileColor} active={mine ? "prayers" : "groups"} />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar"><Link className="back-link" href={prayer.groupId ? `/groups/${prayer.groupId}` : "/prayers"}><ArrowLeft size={18} />{prayer.groupName}</Link><span className={`detail-status ${completed ? "resolved" : "active"}`}>{completed ? <Check size={14} /> : <BookHeart size={14} />}{completed ? "해결된 기도" : prayer.isPersonal ? "개인기도" : "함께 기도 중"}</span></header>
        <div className="content-wrap prayer-detail-content">
          <article className="prayer-detail-card">
            <div className="prayer-detail-author"><ProfileDot color={prayer.authorColor} label={prayer.authorName} size="large" /><div><strong>{mine ? "나" : prayer.authorName}</strong><span>{prayer.groupName}</span></div></div>
            <div className="detail-dates"><span><CalendarDays size={14} />{formatKoreaDate(prayer.createdAt)} 등록</span>{completed && prayer.completedAt && <span className="resolved"><Check size={14} />{formatKoreaDate(prayer.completedAt)} 해결</span>}</div>
            {mine ? <PrayerDetailContent prayer={prayer} groups={bundle.myGroups} /> : <p className="prayer-full-content">{prayer.content}</p>}
            <div className="detail-actions">
              {!completed && <InstantPrayerButton prayerId={prayer.id} initialHasPrayed={prayer.hasPrayed} initialResponseCount={prayer.responseCount} className="daily-prayer-button detail-pray" countPrefix="누적 " iconSize={17} />}
              {mine && <InstantPrayerStatusButton prayerId={prayer.id} initialStatus={prayer.status} initialCompletedAt={prayer.completedAt} className="resolve-button detail-resolve" refreshAfterSuccess />}
            </div>
            {prayer.hasPrayed && !completed && <p className="detail-help">오늘 기도완료 버튼을 다시 누르면 오늘 기록만 취소됩니다. 이전 날짜의 기록은 유지됩니다.</p>}
          </article>

          {query.updated && <div className="page-notice">기도제목을 수정했어요.</div>}
          {query.error && <div className="page-notice error">요청을 처리하지 못했어요.</div>}

          {mine && <section className="prayer-edit-panel prayer-delete-panel"><div className="prayer-delete-row"><div><strong>기도제목 삭제</strong><span>삭제하면 공유된 그룹과 내 기도 목록에서 보이지 않게 됩니다.</span></div><form action={deletePrayer}><input type="hidden" name="prayerId" value={prayer.id} /><input type="hidden" name="returnTo" value={prayer.groupId ? `/groups/${prayer.groupId}` : "/prayers"} /><ConfirmSubmitButton className="danger-button" message="이 기도제목을 삭제할까요?"><Trash2 size={15} />삭제</ConfirmSubmitButton></form></div></section>}
        </div>
      </main>
      <MobileNav active={mine ? "prayers" : "groups"} />
    </div>
  );
}
