import { MobileNav } from "@/components/mobile-nav";

type Tab = "home" | "groups" | "prayers" | "settings";

export function TabPageLoading({ active }: { active?: Tab }) {
  return (
    <div className="app-shell tab-page-loading" aria-busy="true" aria-label="화면 불러오는 중">
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar">
          <span className="skeleton-block tab-loading-back" />
          <span className="skeleton-block tab-loading-pill" />
        </header>
        <div className="content-wrap detail-content">
          <div className="skeleton-block tab-loading-hero" />
          <div className="skeleton-block tab-loading-panel" />
          <div className="skeleton-block tab-loading-panel short" />
        </div>
      </main>
      <MobileNav active={active} />
    </div>
  );
}
