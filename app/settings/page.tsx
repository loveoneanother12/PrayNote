import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BookHeart,
  Check,
  LockKeyhole,
  Mail,
  Settings,
  Smartphone,
  UserRound,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { BrowserPushSettings } from "@/components/browser-push-settings";
import {
  InstantNotificationPreferencesForm,
  InstantPasswordForm,
  InstantProfileForm,
  InstantSignOutButton,
} from "@/components/instant-settings-forms";
import { PrayerReminderSettings } from "@/components/prayer-reminder-settings";
import { SubpageNav } from "@/components/subpage-nav";
import { createClient } from "@/lib/supabase/server";
import { getSettingsBundle } from "@/lib/settings-queries";

type SettingsPageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const [bundle, query] = await Promise.all([getSettingsBundle(supabase), searchParams]);
  if (!bundle) redirect("/login?next=/settings");
  const { preferences, reminderTimes } = bundle;

  const displayName = (bundle.displayName ?? bundle.email.split("@")[0]) || "기도하는 이";
  const notice = query.saved === "profile"
    ? "프로필을 저장했어요."
    : query.saved === "notifications"
      ? "알림 설정을 저장했어요. 앞으로 도착하는 알림부터 적용됩니다."
      : query.saved === "password"
        ? "비밀번호를 저장했어요. 다음 로그인부터 사용할 수 있습니다."
      : "";

  const errorMessage = query.error === "invalid-name"
    ? "이름은 2~30자로 입력해주세요."
    : query.error === "weak-password"
      ? "비밀번호는 8자 이상으로 입력해주세요."
      : query.error === "password-mismatch"
        ? "입력한 비밀번호가 서로 다릅니다."
        : "설정을 저장하지 못했어요.";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active="settings" unreadNotificationCount={bundle.unreadCount} />
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

          {(notice || query.error) && <div className={`page-notice ${query.error ? "error" : ""}`}>{notice || errorMessage}</div>}

          <section className="settings-panel">
            <div className="settings-panel-heading"><span><UserRound size={18} /></span><div><h2>프로필</h2><p>그룹 멤버들에게 표시되는 이름입니다.</p></div></div>
            <InstantProfileForm userId={bundle.userId} displayName={displayName} email={bundle.email} />
          </section>

          <section className="settings-panel">
            <div className="settings-panel-heading"><span><LockKeyhole size={18} /></span><div><h2>비밀번호</h2><p>기존 메일 링크 계정도 여기서 비밀번호를 만들 수 있습니다.</p></div></div>
            <InstantPasswordForm />
          </section>

          <section className="settings-panel">
            <div className="settings-panel-heading"><span><Bell size={18} /></span><div><h2>인앱 알림</h2><p>PrayNote 안에서 받을 새 소식을 선택하세요.</p></div></div>
            <InstantNotificationPreferencesForm initial={{
              inApp: preferences?.in_app_enabled ?? true,
              newPrayer: preferences?.new_prayer_enabled ?? true,
              prayerResponse: preferences?.prayer_response_enabled ?? true,
              membership: preferences?.membership_enabled ?? true,
            }}>
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
            </InstantNotificationPreferencesForm>
          </section>

          <section className="settings-panel upcoming-panel">
            <div className="settings-panel-heading"><span><Smartphone size={18} /></span><div><h2>외부 알림</h2><p>PrayNote를 열지 않았을 때도 소식을 받는 기능입니다.</p></div></div>
            <BrowserPushSettings initialEnabled={preferences?.push_enabled ?? false} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
            <PrayerReminderSettings
              userId={bundle.userId}
              initialTimes={(reminderTimes ?? []).map((item) => ({ id: item.id, timeLocal: item.time_local }))}
              pushEnabled={preferences?.push_enabled ?? false}
            />
            <div className="upcoming-setting"><span className="setting-category-icon email"><Mail size={17} /></span><div><strong>이메일 알림</strong><small>중요 소식을 이메일로 요약해 받는 기능입니다.</small></div><em>준비 중</em></div>
          </section>

          <section className="settings-panel account-panel">
            <div><strong>로그아웃</strong><span>이 기기에서 PrayNote 사용을 종료합니다.</span></div>
            <InstantSignOutButton />
          </section>
        </div>
      </main>
      <MobileNav active="settings" />
    </div>
  );
}
