import Link from "next/link";
import { ArrowLeft, BookHeart, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { PrayerRecordCard } from "@/components/prayer-record-card";
import { MobileNav } from "@/components/mobile-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SubpageNav } from "@/components/subpage-nav";
import { getSearchPrayerPageBundle } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const supabase = await createClient();
  const bundle = await getSearchPrayerPageBundle(supabase, query);
  if (!bundle) redirect(`/login?next=${encodeURIComponent(`/search?q=${query}`)}`);
  const prayers = query ? bundle.prayers : [];
  const displayName = (bundle.displayName ?? bundle.email.split("@")[0]) || "기도하는 이";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active="groups" />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar"><Link className="back-link" href="/dashboard"><ArrowLeft size={18} />대시보드</Link></header>
        <div className="content-wrap search-content">
          <section className="search-heading"><p>기도제목 찾기</p><h1>그룹 기도제목 검색</h1><span>내가 가입한 그룹의 기도제목만 검색됩니다.</span></section>
          <form className="large-search-form" action="/search" method="get"><Search size={21} /><input name="q" defaultValue={query} aria-label="검색어" placeholder="기도 내용에 포함된 단어를 입력하세요" autoFocus /><PendingSubmitButton className="primary-button" pendingText="검색 중…">검색</PendingSubmitButton></form>
          {query && <div className="search-result-summary"><strong>‘{query}’</strong> 검색 결과 <span>{prayers.length}개</span></div>}
          <div className="record-grid search-results">
            {prayers.map((prayer) => <PrayerRecordCard key={prayer.id} prayer={prayer} currentUserId={bundle.userId} returnTo={`/search?q=${encodeURIComponent(query)}`} showGroup />)}
            {query && prayers.length === 0 && <div className="empty-records"><Search size={25} /><strong>일치하는 기도제목이 없어요</strong><span>다른 검색어로 다시 찾아보세요.</span></div>}
            {!query && <div className="empty-records"><BookHeart size={25} /><strong>찾고 싶은 기도제목을 입력해주세요</strong><span>기도 내용에 포함된 단어로 검색할 수 있어요.</span></div>}
          </div>
        </div>
      </main>
      <MobileNav active="groups" />
    </div>
  );
}
