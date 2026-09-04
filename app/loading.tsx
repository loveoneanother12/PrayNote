import { BookHeart } from "lucide-react";

export default function Loading() {
  return (
    <main className="state-page loading-page" aria-busy="true" aria-live="polite">
      <div className="state-card">
        <span className="state-icon pulse"><BookHeart size={25} /></span>
        <h1>기도 기록을 불러오고 있어요</h1>
        <p>잠시만 기다려주세요.</p>
        <div className="loading-lines" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </main>
  );
}
