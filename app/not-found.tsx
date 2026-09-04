import Link from "next/link";
import { BookHeart } from "lucide-react";

export default function NotFound() {
  return (
    <main className="state-page">
      <div className="state-card">
        <span className="state-icon"><BookHeart size={25} /></span>
        <p className="state-kicker">404</p>
        <h1>찾을 수 없는 페이지예요</h1>
        <p>주소가 바뀌었거나, 이 내용을 볼 수 있는 권한이 없을 수 있어요.</p>
        <div className="state-actions"><Link className="primary-button" href="/dashboard">대시보드로 돌아가기</Link><Link className="outline-button" href="/">처음으로</Link></div>
      </div>
    </main>
  );
}
