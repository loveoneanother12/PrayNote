import type { CSSProperties } from "react";
import { Activity, BellRing, BookHeart, CalendarDays, CheckCheck, Layers3, ShieldAlert, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAdminActionLogs, getAdminInsights, isSuperAdmin, type AdminActionLog, type AdminMetricSeries } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";

const number = new Intl.NumberFormat("ko-KR");

const actionLabels: Record<AdminActionLog["action"], string> = {
  "user.suspended": "계정 정지",
  "user.unsuspended": "정지 해제",
  "user.signed_out": "강제 로그아웃",
  "user.deleted": "계정 영구 삭제",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function MiniChart({ title, series, tone }: { title: string; series: AdminMetricSeries; tone: "blue" | "green" }) {
  const max = Math.max(...series.map((point) => point.count), 1);
  return <section className={`admin-chart ${tone}`}><div><h2>{title}</h2><span>최근 14일 · 한국시간</span></div><div className="admin-bars">{series.map((point) => <div className="admin-bar-column" key={point.date} title={`${point.date}: ${point.count}`}><span style={{ "--bar-height": `${Math.max((point.count / max) * 100, point.count ? 8 : 2)}%` } as CSSProperties} /><small>{Number(point.date.slice(-2))}</small></div>)}</div></section>;
}

export default async function AdminInsightsPage() {
  const supabase = await createClient();
  if (!(await isSuperAdmin(supabase))) redirect("/dashboard");
  const [insights, logs] = await Promise.all([getAdminInsights(supabase), getAdminActionLogs(supabase, 12)]);
  const metrics = [
    { label: "전체 회원", value: insights.totalUsers, helper: `오늘 +${insights.newUsersToday}`, icon: Users, tone: "blue" },
    { label: "30일 활성 회원", value: insights.activeUsers30d, helper: `신규 ${insights.newUsers30d}명`, icon: Activity, tone: "green" },
    { label: "전체 그룹", value: insights.totalGroups, helper: `30일 활성 ${insights.activeGroups30d}개`, icon: Layers3, tone: "violet" },
    { label: "전체 기도제목", value: insights.totalPrayers, helper: `개인 ${insights.personalPrayers} · 그룹 ${insights.groupPrayers}`, icon: BookHeart, tone: "rose" },
    { label: "오늘 기도완료", value: insights.prayersCompletedToday, helper: "한국시간 오늘", icon: CheckCheck, tone: "amber" },
    { label: "푸시 활성 회원", value: insights.pushEnabledUsers, helper: "브라우저 푸시 ON", icon: BellRing, tone: "cyan" },
    { label: "최근 7일 가입", value: insights.newUsers7d, helper: "신규 회원", icon: UserPlus, tone: "indigo" },
    { label: "정지 계정", value: insights.suspendedUsers, helper: "현재 접근 제한", icon: ShieldAlert, tone: "slate" },
  ];

  return <AdminShell active="insights"><header className="admin-page-header"><div><p>PRAYNOTE OPERATIONS</p><h1>전체 인사이트</h1><span>서비스의 핵심 활동을 개인정보 원문 없이 집계합니다.</span></div><div className="admin-today"><CalendarDays size={17} />한국시간 기준</div></header><section className="admin-metric-grid">{metrics.map(({ icon: Icon, ...metric }) => <article className={`admin-metric ${metric.tone}`} key={metric.label}><span><Icon size={19} /></span><div><small>{metric.label}</small><strong>{number.format(metric.value)}</strong><em>{metric.helper}</em></div></article>)}</section><section className="admin-chart-grid"><MiniChart title="신규 가입 추이" series={insights.dailySignups} tone="blue" /><MiniChart title="기도제목 등록 추이" series={insights.dailyPrayers} tone="green" /></section><section className="admin-log-panel"><div className="admin-section-heading"><div><h2>최근 관리자 작업</h2><p>계정에 영향을 준 작업을 변경 불가능한 기록으로 확인합니다.</p></div></div>{logs.length ? <div className="admin-log-list">{logs.map((log) => <article key={log.id}><span className={`admin-log-dot ${log.action}`} /><div><strong>{actionLabels[log.action]}</strong><small>{log.targetEmail || "삭제된 계정"}</small></div><p>{log.actorName}</p><time>{formatDate(log.createdAt)}</time></article>)}</div> : <div className="admin-empty">아직 기록된 관리자 작업이 없습니다.</div>}</section></AdminShell>;
}
