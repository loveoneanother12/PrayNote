import Link from "next/link";
import { BookHeart, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { InstantJoinForm } from "@/components/instant-group-actions";
import { getAuthIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type JoinPageProps = {
  searchParams: Promise<{ requested?: string; error?: string }>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);
  if (!user) redirect(`/login?next=${encodeURIComponent("/join")}`);

  return (
    <main className="join-page">
      <Link className="brand join-brand" href="/dashboard"><span className="brand-mark"><BookHeart size={21} /></span><span>PrayNote</span></Link>
      <section className="join-card-panel">
        <span className="join-hero-icon"><Users size={28} /></span>
        <p className="eyebrow">새 공동체에 참여하기</p>
        <h1>초대코드를 입력하세요</h1>
        <p>그룹에서 공유받은 코드를 입력하면 관리자에게 가입 신청이 전달됩니다.</p>
        {query.requested ? (
          <div className="join-result success"><strong>가입 신청을 보냈어요</strong><span>리더 또는 관리자가 승인하면 내 그룹에 표시됩니다.</span><Link href="/dashboard">대시보드로 돌아가기</Link></div>
        ) : (
          <InstantJoinForm />
        )}
      </section>
    </main>
  );
}
