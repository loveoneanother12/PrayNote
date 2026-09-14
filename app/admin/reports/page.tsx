import { CheckCircle2, EyeOff, Flag, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveModerationItem } from "./actions";
import { AdminShell } from "@/components/admin-shell";
import { getAdminModerationCenter, isSuperAdmin, type ModerationStatus } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";

const reasonLabels: Record<string, string> = { spam: "스팸·광고", harassment: "비방·명예훼손", inappropriate: "부적절한 내용", personal_info: "개인정보 노출", other: "기타" };
const statusLabels: Record<ModerationStatus, string> = { pending: "검토 대기", dismissed: "문제없음", hidden: "숨김", deleted: "삭제" };
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function Actions({ id, kind, disabled }: { id: string; kind: "report" | "detection"; disabled: boolean }) {
  if (disabled) return null;
  const choices = [
    { decision: "dismissed", icon: CheckCircle2, label: "문제없음" },
    { decision: "hidden", icon: EyeOff, label: "게시물 숨김" },
    { decision: "deleted", icon: Trash2, label: "게시물 삭제" },
  ] as const;
  return <div className="moderation-actions">{choices.map(({ decision, icon: Icon, label }) => <form action={resolveModerationItem} key={decision}><input type="hidden" name="itemId" value={id} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="decision" value={decision} /><button className={decision === "deleted" ? "danger" : ""} type="submit"><Icon size={14} />{label}</button></form>)}</div>;
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; saved?: string; error?: string }> }) {
  const [supabase, query] = await Promise.all([createClient(), searchParams]);
  if (!(await isSuperAdmin(supabase))) redirect("/dashboard");
  const center = await getAdminModerationCenter(supabase);
  const tab = query.tab === "detections" ? "detections" : "reports";
  const status = query.status === "resolved" ? "resolved" : "pending";
  const reports = center.reports.filter((item) => status === "pending" ? item.status === "pending" : item.status !== "pending");
  const detections = center.detections.filter((item) => status === "pending" ? item.status === "pending" : item.status !== "pending");
  return <AdminShell active="reports">
    <header className="admin-page-header"><div><p>PRAYNOTE TRUST & SAFETY</p><h1>신고 관리</h1><span>신고와 자동 감지 항목을 검토하고 필요한 조치를 선택하세요.</span></div><div className="admin-today"><ShieldAlert size={17} />대기 {center.pendingReportCount + center.pendingDetectionCount}건</div></header>
    {(query.saved || query.error) && <div className={`page-notice ${query.error ? "error" : ""}`}>{query.error ? "처리하지 못했습니다." : "검토 결과를 저장했습니다."}</div>}
    <nav className="moderation-tabs"><Link className={tab === "reports" ? "active" : ""} href={`/admin/reports?tab=reports&status=${status}`}><Flag size={16} />신고 접수 <span>{center.pendingReportCount}</span></Link><Link className={tab === "detections" ? "active" : ""} href={`/admin/reports?tab=detections&status=${status}`}><ShieldAlert size={16} />필터링 단어 감지 <span>{center.pendingDetectionCount}</span></Link></nav>
    <nav className="moderation-status-tabs"><Link className={status === "pending" ? "active" : ""} href={`/admin/reports?tab=${tab}`}>검토 대기</Link><Link className={status === "resolved" ? "active" : ""} href={`/admin/reports?tab=${tab}&status=resolved`}>처리 완료</Link></nav>
    <section className="moderation-list">
      {tab === "reports" && reports.map((item) => <article className="moderation-card" key={item.id}><div className="moderation-card-head"><div><strong>{item.authorName}</strong><span>{item.groupName ?? "개인기도"} · {date(item.createdAt)}</span></div><em className={item.status}>{statusLabels[item.status]}</em></div><p>{item.content}</p><div className="moderation-meta"><span>신고 사유 <strong>{reasonLabels[item.reason] ?? item.reason}</strong></span><span>누적 신고 <strong>{item.reportCount}건</strong></span>{item.details && <span>설명 <strong>{item.details}</strong></span>}</div><Actions id={item.id} kind="report" disabled={item.status !== "pending"} /></article>)}
      {tab === "detections" && detections.map((item) => <article className="moderation-card" key={item.id}><div className="moderation-card-head"><div><strong>{item.authorName}</strong><span>{item.groupName ?? "그룹 미지정"} · {date(item.createdAt)}</span></div><em className={item.status}>{statusLabels[item.status]}</em></div><p>{item.content}</p><div className="detected-terms">감지된 단어 {item.matchedTerms.map((term) => <strong key={term}>{term}</strong>)}</div><Actions id={item.id} kind="detection" disabled={item.status !== "pending"} /></article>)}
      {((tab === "reports" && reports.length === 0) || (tab === "detections" && detections.length === 0)) && <div className="admin-empty"><CheckCircle2 size={24} />{status === "pending" ? "현재 검토할 항목이 없습니다." : "처리된 항목이 없습니다."}</div>}
    </section>
  </AdminShell>;
}
