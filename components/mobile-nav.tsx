import Link from "next/link";
import { Bell, BookHeart, Home, Settings, Users } from "lucide-react";

type MobileNavProps = {
  active?: "home" | "groups" | "prayers" | "notifications" | "settings";
  unreadNotificationCount?: number;
};

export function MobileNav({ active, unreadNotificationCount = 0 }: MobileNavProps) {
  return (
    <nav className="mobile-nav mobile-subpage-nav" aria-label="모바일 메뉴">
      <Link className={active === "home" ? "active" : ""} href="/dashboard"><Home size={20} /><span>홈</span></Link>
      <Link className={active === "groups" ? "active" : ""} href="/dashboard#groups"><Users size={20} /><span>그룹</span></Link>
      <Link className={active === "prayers" ? "active" : ""} href="/prayers"><BookHeart size={20} /><span>내 기도</span></Link>
      <Link className={active === "notifications" ? "active" : ""} href="/notifications"><Bell size={20} /><span>알림</span>{unreadNotificationCount > 0 && <em className="mobile-notification-dot" />}</Link>
      <Link className={active === "settings" ? "active" : ""} href="/settings"><Settings size={20} /><span>설정</span></Link>
    </nav>
  );
}
