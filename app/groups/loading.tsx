import { MobileNav } from "@/components/mobile-nav";

export default function GroupsLoading() {
  return (
    <main className="main-content subpage-main groups-loading-page" aria-busy="true" aria-label="그룹 목록 불러오는 중">
      <div className="content-wrap detail-content groups-dashboard-content">
        <div className="skeleton-block groups-hero-skeleton" />
        <div className="groups-loading-grid">
          <div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" />
        </div>
      </div>
      <MobileNav active="groups" />
    </main>
  );
}
