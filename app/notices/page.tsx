import Link from "next/link";
import { ArrowLeft, BellRing, Megaphone, ShieldCheck, SquarePen, Trash2, X } from "lucide-react";
import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MobileNav } from "@/components/mobile-nav";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaDateTime } from "@/lib/dates";
import { getNoticesPageBundle } from "@/lib/notice-queries";
import { createClient } from "@/lib/supabase/server";
import { createNotice, deleteNotice } from "./actions";

type NoticesPageProps = {
  searchParams: Promise<{ created?: string; deleted?: string; error?: string; compose?: string }>;
};

export default async function NoticesPage({ searchParams }: NoticesPageProps) {
  const supabase = await createClient();
  const [bundle, query] = await Promise.all([getNoticesPageBundle(supabase), searchParams]);
  if (!bundle) redirect("/login?next=/notices");
  const displayName = (bundle.displayName ?? bundle.email.split("@")[0]) || "기도하는 이";
  const composing = bundle.isSuperAdmin && query.compose === "1";
  const message = query.error === "forbidden"
    ? "공지사항 작성 권한이 없습니다."
    : query.error
      ? "공지사항을 처리하지 못했어요. 내용을 확인하고 다시 시도해주세요."
      : query.created
        ? "공지사항을 게시했어요."
        : query.deleted
          ? "공지사항을 삭제했어요."
          : "";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} profileColor={bundle.profileColor} active="settings" unreadNotificationCount={bundle.unreadCount} />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <Link className="back-link" href="/settings"><ArrowLeft size={18} />설정</Link>
          <span className="today-pill"><Megaphone size={15} />공지사항</span>
        </header>
        <div className="content-wrap detail-content notices-content">
          <section className="notices-hero">
            <span className="notices-hero-icon"><Megaphone size={24} /></span>
            <div><p>PrayNote에서 전하는 소식</p><h1>공지사항</h1><span>새로운 기능과 중요한 안내를 이곳에서 확인하세요.</span></div>
            {bundle.isSuperAdmin && <Link className="notice-compose-link" href={composing ? "/notices" : "/notices?compose=1"}>{composing ? <X size={14} /> : <SquarePen size={14} />}{composing ? "작성 닫기" : "공지사항 작성"}</Link>}
          </section>

          {message && <div className={`page-notice ${query.error ? "error" : ""}`}>{message}</div>}

          {composing && (
            <section className="notice-admin-panel">
              <div className="notice-admin-heading"><span><ShieldCheck size={18} /></span><div><h2>공지사항 작성</h2><p>이 영역은 슈퍼어드민에게만 표시됩니다.</p></div></div>
              <form action={createNotice} className="notice-compose-form">
                <label htmlFor="notice-title">제목</label>
                <input id="notice-title" name="title" minLength={2} maxLength={100} required placeholder="공지 제목을 입력해주세요." />
                <label htmlFor="notice-content">내용</label>
                <textarea id="notice-content" name="content" minLength={1} maxLength={5000} required placeholder="회원들에게 전할 내용을 입력해주세요." />
                <button className="primary-button" type="submit"><BellRing size={16} />공지 게시</button>
              </form>
            </section>
          )}

          <section className="notice-board" aria-live="polite">
            {bundle.notices.map((notice) => (
              <article className="notice-card" key={notice.id}>
                <div className="notice-card-head"><span><Megaphone size={15} />공지</span><time dateTime={notice.createdAt}>{formatKoreaDateTime(notice.createdAt)}</time></div>
                <h2>{notice.title}</h2>
                <p>{notice.content}</p>
                {composing && <form action={deleteNotice}><input type="hidden" name="noticeId" value={notice.id} /><ConfirmSubmitButton className="notice-delete-button" message="이 공지사항을 삭제할까요?"><Trash2 size={14} />삭제</ConfirmSubmitButton></form>}
              </article>
            ))}
            {bundle.notices.length === 0 && <div className="empty-notices"><Megaphone size={28} /><strong>아직 등록된 공지사항이 없어요</strong><span>새로운 소식이 생기면 이곳에서 알려드릴게요.</span></div>}
          </section>
        </div>
      </main>
      <MobileNav active="settings" />
    </div>
  );
}
