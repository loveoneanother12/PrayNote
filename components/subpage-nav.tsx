import Link from "next/link";
import { Bell, BookHeart, Home, Settings, Users } from "lucide-react";

type SubpageNavProps = {
  displayName: string;
  active: "groups" | "prayers" | "notifications" | "settings";
  unreadNotificationCount?: number;
};

export function SubpageNav({ displayName, active, unreadNotificationCount = 0 }: SubpageNavProps) {
  return (
    <aside className="sidebar" aria-label="주요 메뉴">
      <Link className="brand" href="/dashboard" aria-label="PrayNote 홈">
        <span className="brand-mark"><BookHeart size={22} /></span>
        <span>PrayNote</span>
      </Link>
      <nav className="side-nav">
        <Link className="nav-item" href="/dashboard"><Home size={19} />홈</Link>
        <Link className={`nav-item ${active === "groups" ? "active" : ""}`} href="/dashboard#groups"><Users size={19} />내 그룹</Link>
        <Link className={`nav-item ${active === "prayers" ? "active" : ""}`} href="/prayers"><BookHeart size={19} />내 기도</Link>
        <Link className={`nav-item ${active === "notifications" ? "active" : ""}`} href="/notifications"><Bell size={19} />알림{unreadNotificationCount > 0 && <span className="nav-count">{unreadNotificationCount}</span>}</Link>
      </nav>
      <div className="side-spacer" />
      <Link className={`nav-item ${active === "settings" ? "active" : ""}`} href="/settings"><Settings size={19} />설정</Link>
      <div className="profile-mini simple-profile">
        <div className="avatar avatar-me">{displayName.slice(0, 2).toUpperCase()}</div>
        <div><strong>{displayName}</strong><span>함께 기도해요</span></div>
      </div>
    </aside>
  );
}
