import Link from "next/link";
import { BookHeart, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { InstantJoinForm } from "@/components/instant-group-actions";
import { createClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ requested?: string; error?: string }>;
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_join_page_bundle_fast", { target_group_id: groupId });
  if (error || !data?.preview) notFound();
  const bundle = data as { authenticated: boolean; preview: { id: string; name: string; description: string | null }; membership_status: string | null };
  if (!bundle.authenticated) redirect(`/login?next=${encodeURIComponent(`/join/${groupId}`)}`);
  if (bundle.membership_status === "active") redirect(`/groups/${groupId}`);
  const group = bundle.preview;

  return (
    <main className="join-page">
      <Link className="brand join-brand" href="/dashboard"><span className="brand-mark"><BookHeart size={21} /></span><span>PrayNote</span></Link>
      <section className="join-card-panel">
        <span className="join-hero-icon"><Users size={28} /></span>
        <p className="eyebrow">그룹 초대</p>
        <h1>{group.name}</h1>
        <p>{group.description || "함께 마음을 나누고 기도하는 공동체예요."}</p>
        {query.requested || bundle.membership_status === "pending" ? (
          <div className="join-result success"><strong>가입 승인 대기 중이에요</strong><span>리더 또는 관리자가 확인하면 알림으로 알려드릴게요.</span><Link href="/dashboard">대시보드로 돌아가기</Link></div>
        ) : (
          <InstantJoinForm groupId={groupId} />
        )}
      </section>
    </main>
  );
}
