import Link from "next/link";
import { ArrowLeft, Bell, BellRing, CheckCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { markAllNotificationsRead } from "@/app/notification-actions";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationListItem } from "@/components/notification-list-item";
import { NotificationRealtime } from "@/components/notification-realtime";
import { SubpageNav } from "@/components/subpage-nav";
import { getNotificationSummaries } from "@/lib/notification-queries";
import { createClient } from "@/lib/supabase/server";

type NotificationsPageProps = {
  searchParams: Promise<{ view?: string; read?: string; error?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const supabase = await createClient();
  const [{ data: userData }, query] = await Promise.all([supabase.auth.getUser(), searchParams]);
  if (!userData.user) redirect("/login?next=/notifications");

  const [{ data: profile }, notifications] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userData.user.id).single(),
    getNotificationSummaries(supabase, userData.user.id, 100),
  ]);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const view = query.view === "unread" ? "unread" : "all";
  const visibleNotifications = view === "unread"
    ? notifications.filter((notification) => !notification.readAt)
    : notifications;
  const displayName = profile?.display_name ?? userData.user.email?.split("@")[0] ?? "기도하는 이";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active="notifications" unreadNotificationCount={unreadCount} />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <Link className="back-link" href="/dashboard"><ArrowLeft size={18} />대시보드</Link>
          {unreadCount > 0 && <form action={markAllNotificationsRead}><button className="mark-all-button" type="submit"><CheckCheck size={16} />모두 읽음</button></form>}
        </header>
        <div className="content-wrap detail-content notifications-content">
          <section className="notifications-hero">
            <span className="notifications-hero-icon"><BellRing size={25} /></span>
            <div><p>함께 기도하는 소식</p><h1>알림</h1><span>새 기도와 오늘의 기도완료, 그룹 가입 소식을 한곳에서 확인해요.</span></div>
            <div className="notification-stat"><strong>{unreadCount}</strong><span>읽지 않은 알림</span></div>
          </section>

          {(query.read || query.error) && <div className={`page-notice ${query.error ? "error" : ""}`}>{query.error ? "알림을 처리하지 못했어요." : "모든 알림을 읽음으로 표시했어요."}</div>}

          <nav className="prayer-filter-tabs" aria-label="알림 필터">
            <Link className={view === "all" ? "active" : ""} href="/notifications">전체 <span>{notifications.length}</span></Link>
            <Link className={view === "unread" ? "active" : ""} href="/notifications?view=unread">읽지 않음 <span>{unreadCount}</span></Link>
          </nav>

          <section className="notifications-list" aria-live="polite">
            {visibleNotifications.map((notification) => <NotificationListItem key={notification.id} notification={notification} />)}
            {visibleNotifications.length === 0 && (
              <div className="empty-notifications"><Bell size={27} /><strong>{view === "unread" ? "새 알림을 모두 확인했어요" : "아직 도착한 알림이 없어요"}</strong><span>공동체에 새로운 소식이 생기면 이곳에 표시됩니다.</span></div>
            )}
          </section>
        </div>
      </main>
      <MobileNav active="notifications" unreadNotificationCount={unreadCount} />
      <NotificationRealtime userId={userData.user.id} />
    </div>
  );
}
