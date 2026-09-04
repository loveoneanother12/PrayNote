import Link from "next/link";
import { BookHeart, KeyRound, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { requestMembership } from "@/app/group-actions";
import { createClient } from "@/lib/supabase/server";

type JoinPageProps = {
  searchParams: Promise<{ requested?: string; error?: string }>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent("/join")}`);

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
          <form action={requestMembership} className="join-form">
            <label htmlFor="invite-code"><KeyRound size={15} />초대코드</label>
            <input id="invite-code" name="inviteCode" placeholder="PRAY-XXXXXXXX" autoCapitalize="characters" maxLength={13} required />
            {query.error && <span className="form-error">{query.error === "invalid-code" ? "초대코드가 올바르지 않아요." : "가입 신청을 보내지 못했어요."}</span>}
            <button className="primary-button" type="submit">가입 신청 보내기</button>
          </form>
        )}
      </section>
    </main>
  );
}
