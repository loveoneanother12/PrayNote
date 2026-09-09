import Link from "next/link";
import { ArrowLeft, BarChart3, BookHeart, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";

export function AdminShell({ active, children }: { active: "insights" | "users"; children: ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/dashboard"><span><BookHeart size={20} /></span><div><strong>PrayNote</strong><small>ADMIN CENTER</small></div></Link>
        <div className="admin-authority"><ShieldCheck size={17} /><span><strong>슈퍼어드민</strong><small>보호된 운영 공간</small></span></div>
        <nav aria-label="관리자 메뉴">
          <Link className={active === "insights" ? "active" : ""} href="/admin/insights"><BarChart3 size={18} />인사이트</Link>
          <Link className={active === "users" ? "active" : ""} href="/admin/users"><Users size={18} />회원 관리</Link>
        </nav>
        <Link className="admin-back" href="/settings"><ArrowLeft size={16} />PrayNote 설정으로</Link>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
