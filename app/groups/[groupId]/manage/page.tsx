import Link from "next/link";
import { ArrowLeft, Crown, ShieldCheck, Trash2, UserMinus, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { deleteGroup, leaveGroup } from "@/app/group-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { InstantAdminRoleButton, InstantGroupSettingsForm, InstantMembershipReview } from "@/components/instant-group-actions";
import { MobileNav } from "@/components/mobile-nav";
import { SubpageNav } from "@/components/subpage-nav";
import { formatKoreaDate } from "@/lib/dates";
import { getGroupManageBundle } from "@/lib/group-queries";
import { createClient } from "@/lib/supabase/server";

type ManageGroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ reviewed?: string; role?: string; updated?: string; error?: string }>;
};

export default async function ManageGroupPage({ params, searchParams }: ManageGroupPageProps) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const bundle = await getGroupManageBundle(supabase, groupId);
  if (!bundle) redirect("/login");
  const overview = bundle.overview;
  if (!overview) notFound();

  const { group, role, memberships } = overview;
  const canModerate = role === "leader" || role === "admin";
  const isLeader = role === "leader";
  const nameFor = (userId: string) => memberships.find((item) => item.user_id === userId)?.display_name ?? "가입 신청자";
  const pending = memberships.filter((membership) => membership.status === "pending");
  const active = memberships.filter((membership) => membership.status === "active");
  const displayName = (overview.displayName ?? bundle.email.split("@")[0]) || "기도하는 이";
  const notice = query.reviewed === "approved" ? "가입 신청을 승인했어요." : query.reviewed === "rejected" ? "가입 신청을 거절했어요." : query.role === "admin" ? "Admin 권한을 부여했어요." : query.role === "member" ? "Admin 권한을 해제했어요." : query.updated ? "그룹 정보를 수정했어요." : "";

  return (
    <div className="app-shell">
      <SubpageNav displayName={displayName} active="groups" />
      <main className="main-content subpage-main">
        <header className="topbar subpage-topbar"><Link className="back-link" href={`/groups/${groupId}`}><ArrowLeft size={18} />{group.name}</Link><span className="management-role">내 역할 · {role.toUpperCase()}</span></header>
        <div className="content-wrap detail-content manage-content">
          <section className="manage-heading"><div><p>그룹 운영</p><h1>{group.name} 관리</h1><span>멤버와 가입 신청, 그룹 정보를 관리합니다.</span></div><div className="manage-member-count"><Users size={20} /><strong>{active.length}</strong><span>활동 멤버</span></div></section>

          {(notice || query.error) && <div className={`page-notice ${query.error ? "error" : ""}`}>{notice || "요청을 처리하지 못했어요."}</div>}

          {canModerate && (
            <section className="manage-panel">
              <div className="manage-panel-heading"><div><h2>가입 승인 대기</h2><span>초대코드로 가입을 신청한 사용자입니다.</span></div><strong>{pending.length}</strong></div>
              <div className="membership-list">
                {pending.map((membership) => (
                  <div className="membership-row" key={membership.id}>
                    <div className="avatar avatar-2">{nameFor(membership.user_id).slice(0, 2)}</div>
                    <div><strong>{nameFor(membership.user_id)}</strong><span>{formatKoreaDate(membership.requested_at)} 신청</span></div>
                    <InstantMembershipReview membershipId={membership.id} />
                  </div>
                ))}
                {pending.length === 0 && <div className="empty-members">대기 중인 가입 신청이 없어요.</div>}
              </div>
            </section>
          )}

          <section className="manage-panel">
            <div className="manage-panel-heading"><div><h2>멤버</h2><span>현재 그룹의 활동 멤버와 역할입니다.</span></div><strong>{active.length}</strong></div>
            <div className="membership-list">
              {active.map((membership) => (
                <div className="membership-row" key={membership.id}>
                  <div className="avatar avatar-1">{nameFor(membership.user_id).slice(0, 2)}</div>
                  <div><strong>{membership.user_id === bundle.userId ? `${nameFor(membership.user_id)} (나)` : nameFor(membership.user_id)}</strong><span>{membership.role === "leader" ? "Leader" : membership.role === "admin" ? "Admin · 가입 승인 가능" : "Member"}</span></div>
                  <span className={`member-role-badge ${membership.role}`}>{membership.role === "leader" ? <Crown size={13} /> : membership.role === "admin" ? <ShieldCheck size={13} /> : null}{membership.role.toUpperCase()}</span>
                  {isLeader && membership.user_id !== bundle.userId && membership.role !== "leader" && (
                    <InstantAdminRoleButton groupId={groupId} userId={membership.user_id} initialIsAdmin={membership.role === "admin"} />
                  )}
                </div>
              ))}
            </div>
          </section>

          {isLeader && (
            <section className="manage-panel">
              <div className="manage-panel-heading"><div><h2>그룹 정보</h2><span>그룹 이름과 소개를 수정할 수 있습니다.</span></div></div>
              <InstantGroupSettingsForm groupId={groupId} initialName={group.name} initialDescription={group.description ?? ""} />
            </section>
          )}

          <section className="manage-panel danger-panel">
            <div className="manage-panel-heading"><div><h2>{isLeader ? "그룹 삭제" : "그룹 탈퇴"}</h2><span>{isLeader ? "그룹과 모든 기도 기록에 더 이상 접근할 수 없게 됩니다." : "탈퇴하면 그룹의 기도제목을 더 이상 볼 수 없습니다."}</span></div></div>
            <form action={isLeader ? deleteGroup : leaveGroup}><input type="hidden" name="groupId" value={groupId} /><ConfirmSubmitButton className="danger-button" message={isLeader ? `‘${group.name}’ 그룹을 정말 삭제할까요?` : `‘${group.name}’ 그룹에서 탈퇴할까요?`}>{isLeader ? <><Trash2 size={16} />그룹 삭제</> : <><UserMinus size={16} />그룹 탈퇴</>}</ConfirmSubmitButton></form>
          </section>
        </div>
      </main>
      <MobileNav active="groups" />
    </div>
  );
}
