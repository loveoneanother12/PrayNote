import Link from "next/link";
import { ArrowLeft, BookHeart, CalendarDays, Check, Heart, Save, Trash2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { deletePrayer, togglePrayerCompleted, toggleTodayPrayer, updatePrayer } from "@/app/prayer-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MobileNav } from "@/components/mobile-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaDate } from "@/lib/dates";
import { getAuthIdentity } from "@/lib/auth";
import { getPrayerSummaries } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type PrayerDetailPageProps = {
  params: Promise<{ prayerId: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
};

export default async function PrayerDetailPage({ params, searchParams }: PrayerDetailPageProps) {
  const [{ prayerId }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(prayerId)) notFound();

  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);
  if (!user) redirect("/login");

  const [{ data: profile }, prayers] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    getPrayerSummaries(supabase, user.id, { prayerIds: [prayerId] }),
  ]);
  const prayer = prayers[0];
  if (!prayer) notFound();

  const mine = prayer.authorId === user.id;
  const completed = prayer.status === "completed";
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "기도하는 이";
  const detailPath = `/prayers/${prayer.id}`;

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active={mine ? "prayers" : "groups"} />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar"><Link className="back-link" href={prayer.groupId ? `/groups/${prayer.groupId}` : "/prayers"}><ArrowLeft size={18} />{prayer.groupName}</Link><span className={`detail-status ${completed ? "resolved" : "active"}`}>{completed ? <Check size={14} /> : <BookHeart size={14} />}{completed ? "해결된 기도" : prayer.isPersonal ? "개인기도" : "함께 기도 중"}</span></header>
        <div className="content-wrap prayer-detail-content">
          <article className="prayer-detail-card">
            <div className="prayer-detail-author"><div className="avatar avatar-1">{prayer.authorName.slice(0, 2)}</div><div><strong>{mine ? "나" : prayer.authorName}</strong><span>{prayer.groupName}</span></div></div>
            <div className="detail-dates"><span><CalendarDays size={14} />{formatKoreaDate(prayer.createdAt)} 등록</span>{completed && prayer.completedAt && <span className="resolved"><Check size={14} />{formatKoreaDate(prayer.completedAt)} 해결</span>}</div>
            <p className="prayer-full-content">{prayer.content}</p>
            <div className="detail-actions">
              {!completed && <form action={toggleTodayPrayer}><input type="hidden" name="prayerId" value={prayer.id} /><input type="hidden" name="returnTo" value={detailPath} /><PendingSubmitButton className={`daily-prayer-button detail-pray ${prayer.hasPrayed ? "done" : ""}`} pendingText="기록 중…">{prayer.hasPrayed ? <Check size={17} /> : <Heart size={17} />}{prayer.hasPrayed ? "오늘 기도완료" : "오늘 기도하기"}<span>누적 {prayer.responseCount}회</span></PendingSubmitButton></form>}
              {mine && <form action={togglePrayerCompleted}><input type="hidden" name="prayerId" value={prayer.id} /><input type="hidden" name="returnTo" value={detailPath} /><input type="hidden" name="status" value={completed ? "active" : "completed"} /><PendingSubmitButton className="resolve-button detail-resolve" pendingText="변경 중…">{completed ? "진행 중으로 되돌리기" : "해결 완료"}</PendingSubmitButton></form>}
            </div>
            {prayer.hasPrayed && !completed && <p className="detail-help">오늘 기도완료 버튼을 다시 누르면 오늘 기록만 취소됩니다. 이전 날짜의 기록은 유지됩니다.</p>}
          </article>

          {query.updated && <div className="page-notice">기도제목을 수정했어요.</div>}
          {query.error && <div className="page-notice error">요청을 처리하지 못했어요.</div>}

          {mine && (
            <section className="prayer-edit-panel">
              <div><h2>기도제목 수정</h2><span>등록일과 기존 기도 기록은 그대로 유지됩니다.</span></div>
              <form action={updatePrayer}><input type="hidden" name="prayerId" value={prayer.id} /><input type="hidden" name="returnTo" value={detailPath} /><textarea name="content" defaultValue={prayer.content} minLength={1} maxLength={2000} required /><PendingSubmitButton className="primary-button" pendingText="저장 중…"><Save size={16} />수정 저장</PendingSubmitButton></form>
              <div className="prayer-delete-row"><div><strong>기도제목 삭제</strong><span>삭제하면 공유된 그룹과 내 기도 목록에서 보이지 않게 됩니다.</span></div><form action={deletePrayer}><input type="hidden" name="prayerId" value={prayer.id} /><input type="hidden" name="returnTo" value={prayer.groupId ? `/groups/${prayer.groupId}` : "/prayers"} /><ConfirmSubmitButton className="danger-button" message="이 기도제목을 삭제할까요?"><Trash2 size={15} />삭제</ConfirmSubmitButton></form></div>
            </section>
          )}
        </div>
      </main>
      <MobileNav active={mine ? "prayers" : "groups"} />
    </div>
  );
}
