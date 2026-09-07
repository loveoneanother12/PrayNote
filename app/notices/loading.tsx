import { Megaphone } from "lucide-react";

export default function NoticesLoading() {
  return (
    <main className="state-page loading-page" aria-busy="true" aria-live="polite">
      <div className="state-card">
        <span className="state-icon pulse"><Megaphone size={25} /></span>
        <h1>공지사항을 불러오고 있어요</h1>
        <p>새로운 소식을 정리하고 있습니다.</p>
        <div className="loading-lines" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </main>
  );
}
