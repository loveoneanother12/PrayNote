"use client";

import Link from "next/link";
import { BookHeart, Home, Pencil, Settings, Users } from "lucide-react";

type MobileNavProps = {
  active?: "home" | "groups" | "prayers" | "notifications" | "settings";
  onCreatePrayer?: () => void;
};

export function MobileNav({ active, onCreatePrayer }: MobileNavProps) {
  const createControl = onCreatePrayer ? (
    <button className="mobile-create-prayer" type="button" onClick={onCreatePrayer} aria-label="기도제목 작성"><Pencil size={23} /></button>
  ) : (
    <Link className="mobile-create-prayer" href="/dashboard?compose=1" prefetch aria-label="기도제목 작성"><Pencil size={23} /></Link>
  );

  return (
    <nav className="mobile-nav" aria-label="모바일 메뉴">
      <Link className={active === "home" ? "active" : ""} href="/dashboard" prefetch><Home size={20} /><span>홈</span></Link>
      <Link className={active === "groups" ? "active" : ""} href="/groups" prefetch><Users size={20} /><span>그룹</span></Link>
      {createControl}
      <Link className={active === "prayers" ? "active" : ""} href="/prayers" prefetch><BookHeart size={20} /><span>마이</span></Link>
      <Link className={active === "settings" ? "active" : ""} href="/settings" prefetch><Settings size={20} /><span>설정</span></Link>
    </nav>
  );
}
