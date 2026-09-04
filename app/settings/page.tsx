import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BookHeart,
  Check,
  LogOut,
  Mail,
  Settings,
  Smartphone,
  UserRound,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { signOut, updateNotificationPreferences, updateProfile } from "@/app/settings/actions";
import { MobileNav } from "@/components/mobile-nav";
import { SubpageNav } from "@/components/subpage-nav";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const [{ data: userData }, query] = await Promise.all([supabase.auth.getUser(), searchParams]);
  if (!userData.user) redirect("/login?next=/settings");

  const [{ data: profile }, { data: preferences }, { count: unreadCount }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userData.user.id).single(),
    supabase
      .from("notification_preferences")
      .select("in_app_enabled, new_prayer_enabled, prayer_response_enabled, membership_enabled, push_enabled, email_enabled")
      .eq("user_id", userData.user.id)
      .single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userData.user.id).is("read_at", null),
  ]);

  const displayName = profile?.display_name ?? userData.user.email?.split("@")[0] ?? "기도하는 이";
  const notice = query.saved === "profile"
    ? "프로필을 저장했어요."
    : query.saved === "notifications"
      ? "알림 설정을 저장했어요. 앞으로 도착하는 알림부터 적용됩니다."
      : "";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active="settings" unreadNotificationCount={unreadCount ?? 0} />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <Link className="back-link" href="/dashboard"><ArrowLeft size={18} />대시보드</Link>
          <span className="today-pill"><Settings size={15} />내 설정</span>
        </header>
        <div className="content-wrap detail-content settings-content">
          <section className="settings-hero">
            <span className="settings-hero-icon"><Settings size={24} /></span>
            <div><p>나에게 맞는 PrayNote</p><h1>설정</h1><span>프로필과 앞으로 받을 알림을 관리합니다.</span></div>
          </section>

          {(notice || query.error) && <div className={`page-notice ${query.error ? "error" : ""}`}>{notice || (query.error === "invalid-name" ? "이름은 2~30자로 입력해주세요." : "설정을 저장하지 못했어요.")}</div>}

          <section className="settings-panel">
            <div className="settings-panel-heading"><span><UserRound size={18} /></span><div><h2>프로필</h2><p>그룹 멤버들에게 표시되는 이름입니다.</p></div></div>
            <form action={updateProfile} className="profile-settings-form">
              <label htmlFor="display-name">표시 이름</label>
              <input id="display-name" name="displayName" defaultValue={displayName} minLength={2} maxLength={30} required />
              <label htmlFor="account-email">로그인 이메일</label>
              <input id="account-email" value={userData.user.email ?? ""} readOnly aria-readonly="true" />
              <p>로그인 이메일은 현재 변경할 수 없습니다.</p>
              <button className="primary-button" type="submit"><Check size={16} />프로필 저장</button>
            </form>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-heading"><span><Bell size={18} /></span><div><h2>인앱 알림</h2><p>PrayNote 안에서 받을 새 소식을 선택하세요.</p></div></div>
            <form action={updateNotificationPreferences} className="notification-settings-form">
              <label className="setting-toggle master-toggle">
                <span className="setting-copy"><strong>인앱 알림 받기</strong><small>모든 새 알림을 한 번에 켜거나 끕니다.</small></span>
                <input type="checkbox" name="inAppEnabled" defaultChecked={preferences?.in_app_enabled ?? true} />
                <span className="switch" aria-hidden="true" />
              </label>
              <div className="setting-toggle-group">
                <label className="setting-toggle">
                  <span className="setting-category-icon prayer"><BookHeart size={17} /></span>
                  <span className="setting-copy"><strong>새 기도제목</strong><small>그룹에 새 기도제목이 등록되면 알려드려요.</small></span>
                  <input type="checkbox" name="newPrayerEnabled" defaultChecked={preferences?.new_prayer_enabled ?? true} />
                  <span className="switch" aria-hidden="true" />
                </label>
                <label className="setting-toggle">
                  <span className="setting-category-icon response"><Check size={17} /></span>
                  <span className="setting-copy"><strong>오늘의 기도완료</strong><small>누군가 내 기도제목을 위해 기도하면 알려드려요.</small></span>
                  <input type="checkbox" name="prayerResponseEnabled" defaultChecked={preferences?.prayer_response_enabled ?? true} />
                  <span className="switch" aria-hidden="true" />
                </label>
                <label className="setting-toggle">
                  <span className="setting-category-icon membership"><Users size={17} /></span>
                  <span className="setting-copy"><strong>그룹과 멤버</strong><small>가입 신청·승인과 역할 변경 소식을 알려드려요.</small></span>
                  <input type="checkbox" name="membershipEnabled" defaultChecked={preferences?.membership_enabled ?? true} />
                  <span className="switch" aria-hidden="true" />
                </label>
              </div>
              <div className="settings-save-row"><span>기존 알림은 유지되고 새로 발생하는 알림부터 적용됩니다.</span><button className="primary-button" type="submit">알림 설정 저장</button></div>
            </form>
          </section>

          <section className="settings-panel upcoming-panel">
            <div className="settings-panel-heading"><span><Smartphone size={18} /></span><div><h2>외부 알림</h2><p>PrayNote를 열지 않았을 때도 소식을 받는 기능입니다.</p></div></div>
            <div className="upcoming-setting"><span className="setting-category-icon push"><Smartphone size={17} /></span><div><strong>브라우저 푸시</strong><small>기기 알림 권한과 발송 서버 연결 후 제공됩니다.</small></div><em>준비 중</em></div>
            <div className="upcoming-setting"><span className="setting-category-icon email"><Mail size={17} /></span><div><strong>이메일 알림</strong><small>중요 소식을 이메일로 요약해 받는 기능입니다.</small></div><em>준비 중</em></div>
          </section>

          <section className="settings-panel account-panel">
            <div><strong>로그아웃</strong><span>이 기기에서 PrayNote 사용을 종료합니다.</span></div>
            <form action={signOut}><button className="logout-button" type="submit"><LogOut size={16} />로그아웃</button></form>
          </section>
        </div>
      </main>
      <MobileNav active="settings" unreadNotificationCount={unreadCount ?? 0} />
    </div>
  );
}
