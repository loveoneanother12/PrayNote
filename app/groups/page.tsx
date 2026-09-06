import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { GroupsDashboard } from "@/components/groups-dashboard";
import { MobileNav } from "@/components/mobile-nav";
import { SubpageNav } from "@/components/subpage-nav";
import { getDashboardOverview } from "@/lib/dashboard-queries";
import { createClient } from "@/lib/supabase/server";

export default async function GroupsPage() {
  const supabase = await createClient();
  const overview = await getDashboardOverview(supabase);
  if (!overview) redirect("/login?next=/groups");

  const displayName = overview.displayName || "기도하는 이";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} profileColor={overview.profileColor} active="groups" unreadNotificationCount={overview.unreadCount} />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <Link className="back-link" href="/dashboard"><ArrowLeft size={18} />대시보드</Link>
          <span className="today-pill"><Users size={15} />내 그룹</span>
        </header>
        <div className="content-wrap detail-content groups-dashboard-content">
          <GroupsDashboard initialGroups={overview.groups} />
        </div>
      </main>
      <MobileNav active="groups" />
    </div>
  );
}
