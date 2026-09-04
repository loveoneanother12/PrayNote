"use client";

import Link from "next/link";
import { BookHeart, Home, Plus, Settings, Users } from "lucide-react";

type MobileNavProps = {
  active?: "home" | "groups" | "prayers" | "notifications" | "settings";
  onCreatePrayer?: () => void;
};

export function MobileNav({ active, onCreatePrayer }: MobileNavProps) {
  const createControl = onCreatePrayer ? (
    <button className="mobile-create-prayer" type="button" onClick={onCreatePrayer} aria-label="기도제목 작성"><Plus size={25} /></button>
  ) : (
    <Link className="mobile-create-prayer" href="/dashboard?compose=1" aria-label="기도제목 작성"><Plus size={25} /></Link>
  );

  return (
    <nav className="mobile-nav" aria-label="모바일 메뉴">
      <Link className={active === "home" ? "active" : ""} href="/dashboard"><Home size={20} /><span>홈</span></Link>
      <Link className={active === "groups" ? "active" : ""} href="/dashboard#groups"><Users size={20} /><span>그룹</span></Link>
      {createControl}
      <Link className={active === "prayers" ? "active" : ""} href="/prayers"><BookHeart size={20} /><span>내 기도</span></Link>
      <Link className={active === "settings" ? "active" : ""} href="/settings"><Settings size={20} /><span>설정</span></Link>
    </nav>
  );
}
