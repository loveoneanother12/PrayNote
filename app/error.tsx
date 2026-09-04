"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("PrayNote route error", error);
  }, [error]);

  return (
    <main className="state-page">
      <div className="state-card">
        <span className="state-icon error"><CircleAlert size={25} /></span>
        <p className="state-kicker">잠시 문제가 생겼어요</p>
        <h1>페이지를 불러오지 못했어요</h1>
        <p>인터넷 연결을 확인한 뒤 다시 시도해주세요.</p>
        <div className="state-actions"><button className="primary-button" onClick={retry}><RefreshCw size={16} />다시 시도</button><Link className="outline-button" href="/dashboard">대시보드로 이동</Link></div>
        {error.digest && <small>오류 확인 번호 · {error.digest}</small>}
      </div>
    </main>
  );
}
