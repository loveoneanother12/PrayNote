import Link from "next/link";
import { BookHeart, KeyRound, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requestMembership } from "@/app/group-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ requested?: string; error?: string }>;
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: preview, error: previewError } = await supabase.rpc("get_join_group_preview", { target_group_id: groupId });
  if (previewError || !preview?.[0]) notFound();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=${encodeURIComponent(`/join/${groupId}`)}`);

  const { data: membership } = await supabase.from("group_memberships").select("status").eq("group_id", groupId).eq("user_id", userData.user.id).maybeSingle();
  if (membership?.status === "active") redirect(`/groups/${groupId}`);

  const group = preview[0];

  return (
    <main className="join-page">
      <Link className="brand join-brand" href="/dashboard"><span className="brand-mark"><BookHeart size={21} /></span><span>PrayNote</span></Link>
      <section className="join-card-panel">
        <span className="join-hero-icon"><Users size={28} /></span>
        <p className="eyebrow">그룹 초대</p>
        <h1>{group.name}</h1>
        <p>{group.description || "함께 마음을 나누고 기도하는 공동체예요."}</p>
        {query.requested || membership?.status === "pending" ? (
          <div className="join-result success"><strong>가입 승인 대기 중이에요</strong><span>리더 또는 관리자가 확인하면 알림으로 알려드릴게요.</span><Link href="/dashboard">대시보드로 돌아가기</Link></div>
        ) : (
          <form action={requestMembership} className="join-form">
            <input type="hidden" name="groupId" value={groupId} />
            <label htmlFor="invite-code"><KeyRound size={15} />초대코드 확인</label>
            <input id="invite-code" name="inviteCode" placeholder="PRAY-XXXXXXXX" autoCapitalize="characters" maxLength={13} required />
            {query.error && <span className="form-error">{query.error === "invalid-code" ? "초대코드가 일치하지 않아요." : "가입 신청을 보내지 못했어요."}</span>}
            <PendingSubmitButton className="primary-button" pendingText="신청 중…">이 그룹에 가입 신청</PendingSubmitButton>
          </form>
        )}
      </section>
    </main>
  );
}
