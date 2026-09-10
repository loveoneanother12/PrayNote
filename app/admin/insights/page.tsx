import type { CSSProperties, ElementType } from "react";
import { Activity, BellRing, BookHeart, CalendarDays, CheckCheck, CircleGauge, Clock3, Flag, HeartPulse, Layers3, LogIn, ShieldAlert, Trash2, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAdminActionLogs, getAdminInsights, isSuperAdmin, type AdminActionLog, type AdminMetricSeries } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";

const number = new Intl.NumberFormat("ko-KR");
const actionLabels: Record<AdminActionLog["action"], string> = { "user.suspended": "계정 정지", "user.unsuspended": "정지 해제", "user.signed_out": "강제 로그아웃", "user.deleted": "계정 영구 삭제" };
type Metric = { label: string; value: number; helper: string; icon: ElementType; tone: string; suffix?: string };

function formatDate(value: string) { return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function rate(part: number, total: number) { return total ? Math.round((part / total) * 100) : 0; }

function MetricGroup({ title, description, metrics }: { title: string; description: string; metrics: Metric[] }) {
  return <section className="admin-insight-group"><div className="admin-section-heading"><div><h2>{title}</h2><p>{description}</p></div></div><div className="admin-metric-grid">{metrics.map(({ icon: Icon, ...metric }) => <article className={`admin-metric ${metric.tone}`} key={metric.label}><span><Icon size={19} /></span><div><small>{metric.label}</small><strong>{number.format(metric.value)}{metric.suffix}</strong><em>{metric.helper}</em></div></article>)}</div></section>;
}

function MiniChart({ title, series, tone }: { title: string; series: AdminMetricSeries; tone: "blue" | "green" | "rose" }) {
  const max = Math.max(...series.map((point) => point.count), 1);
  return <section className={`admin-chart ${tone}`}><div><h2>{title}</h2><span>최근 14일 · 한국시간</span></div><div className="admin-bars">{series.map((point) => <div className="admin-bar-column" key={point.date} title={`${point.date}: ${point.count}`}><span style={{ "--bar-height": `${Math.max((point.count / max) * 100, point.count ? 8 : 2)}%` } as CSSProperties} /><small>{Number(point.date.slice(-2))}</small></div>)}</div></section>;
}

export default async function AdminInsightsPage() {
  const supabase = await createClient();
  if (!(await isSuperAdmin(supabase))) redirect("/dashboard");
  const [insights, logs] = await Promise.all([getAdminInsights(supabase), getAdminActionLogs(supabase, 12)]);
  const groups = [
    { title: "핵심 현황", description: "오늘 운영 상태를 가장 먼저 확인하세요.", metrics: [
      { label: "전체 회원", value: insights.totalUsers, helper: `오늘 +${insights.newUsersToday}`, icon: Users, tone: "blue" },
      { label: "7일 활성 회원", value: insights.activeUsers7d, helper: `전체의 ${rate(insights.activeUsers7d, insights.totalUsers)}%`, icon: Activity, tone: "green" },
      { label: "활성 그룹", value: insights.activeGroups30d, helper: "최근 30일 기도 공유", icon: Layers3, tone: "violet" },
      { label: "오늘 기도완료", value: insights.prayersCompletedToday, helper: "한국시간 오늘", icon: CheckCheck, tone: "amber" },
    ]},
    { title: "사용자 활성도", description: "가입과 재방문 흐름을 기간별로 비교합니다.", metrics: [
      { label: "최근 7일 가입", value: insights.newUsers7d, helper: `30일 ${insights.newUsers30d}명`, icon: UserPlus, tone: "indigo" },
      { label: "30일 활성 회원", value: insights.activeUsers30d, helper: `전체의 ${rate(insights.activeUsers30d, insights.totalUsers)}%`, icon: LogIn, tone: "green" },
      { label: "푸시 설정 회원", value: insights.pushEnabledUsers, helper: `구독 연결 ${insights.pushSubscribedUsers}명`, icon: BellRing, tone: "cyan" },
      { label: "정지 계정", value: insights.suspendedUsers, helper: "현재 접근 제한", icon: ShieldAlert, tone: "slate" },
    ]},
    { title: "기도 활동", description: "기도 내용은 열람하지 않고 활동량만 집계합니다.", metrics: [
      { label: "전체 기도제목", value: insights.totalPrayers, helper: `최근 7일 +${insights.prayers7d}`, icon: BookHeart, tone: "rose" },
      { label: "그룹 기도", value: insights.groupPrayers, helper: `개인기도 ${insights.personalPrayers}개`, icon: Users, tone: "blue" },
      { label: "해결된 기도", value: insights.resolvedPrayers, helper: `전체의 ${rate(insights.resolvedPrayers, insights.totalPrayers)}%`, icon: HeartPulse, tone: "green" },
      { label: "7일 기도완료", value: insights.prayerResponses7d, helper: "기도 체크 횟수", icon: CheckCheck, tone: "amber" },
    ]},
    { title: "그룹 건전성", description: "운영이 멈췄거나 관리가 필요한 그룹을 찾습니다.", metrics: [
      { label: "전체 그룹", value: insights.totalGroups, helper: `활성 ${insights.activeGroups30d}개`, icon: Layers3, tone: "violet" },
      { label: "30일 휴면 그룹", value: insights.dormantGroups30d, helper: "최근 기도 공유 없음", icon: Clock3, tone: "slate" },
      { label: "가입 승인 대기", value: insights.pendingMemberships, helper: "현재 처리 필요", icon: UserPlus, tone: "amber" },
      { label: "리더 없는 그룹", value: insights.groupsWithoutLeader, helper: `평균 승인 ${insights.averageApprovalHours}시간`, icon: ShieldAlert, tone: "rose" },
    ]},
    { title: "챌린지 성과", description: "공동체 기도 챌린지의 참여와 완주 흐름입니다.", metrics: [
      { label: "전체 챌린지", value: insights.totalChallenges, helper: `진행·예정 ${insights.activeChallenges}개`, icon: Flag, tone: "violet" },
      { label: "완료 챌린지", value: insights.completedChallenges, helper: `완주율 ${rate(insights.successfulChallenges, insights.completedChallenges)}%`, icon: CheckCheck, tone: "green" },
      { label: "성공한 챌린지", value: insights.successfulChallenges, helper: "공동 목표 달성", icon: HeartPulse, tone: "rose" },
      { label: "현재 참여", value: insights.challengeParticipants, helper: "중복 참여 포함", icon: Users, tone: "blue" },
    ]},
    { title: "알림과 운영 안전", description: "도달 상태와 정리 대상을 함께 점검합니다.", metrics: [
      { label: "7일 알림 생성", value: insights.notifications7d, helper: `미확인 ${insights.unreadNotifications}개`, icon: BellRing, tone: "cyan" },
      { label: "7일 푸시 성공", value: insights.pushDelivered7d, helper: `실패 ${insights.pushFailed7d}건`, icon: CircleGauge, tone: "green" },
      { label: "푸시 실패율", value: rate(insights.pushFailed7d, insights.pushDelivered7d + insights.pushFailed7d), helper: "최근 7일 전송 시도", icon: ShieldAlert, tone: "rose", suffix: "%" },
      { label: "휴지통 기도", value: insights.trashPrayers, helper: "사용자 복원 가능", icon: Trash2, tone: "slate" },
    ]},
  ];
  return <AdminShell active="insights"><header className="admin-page-header"><div><p>PRAYNOTE OPERATIONS</p><h1>전체 인사이트</h1><span>개인정보 원문 없이 서비스 상태를 영역별로 집계합니다.</span></div><div className="admin-today"><CalendarDays size={17} />한국시간 기준</div></header>{groups.map((group) => <MetricGroup key={group.title} {...group} />)}<section className="admin-chart-grid"><MiniChart title="신규 가입 추이" series={insights.dailySignups} tone="blue" /><MiniChart title="기도제목 등록 추이" series={insights.dailyPrayers} tone="green" /><MiniChart title="기도완료 추이" series={insights.dailyResponses} tone="rose" /></section><section className="admin-log-panel"><div className="admin-section-heading"><div><h2>최근 관리자 작업</h2><p>계정에 영향을 준 작업을 변경 불가능한 기록으로 확인합니다.</p></div></div>{logs.length ? <div className="admin-log-list">{logs.map((log) => <article key={log.id}><span className={`admin-log-dot ${log.action}`} /><div><strong>{actionLabels[log.action]}</strong><small>{log.targetEmail || "삭제된 계정"}</small></div><p>{log.actorName}</p><time>{formatDate(log.createdAt)}</time></article>)}</div> : <div className="admin-empty">아직 기록된 관리자 작업이 없습니다.</div>}</section></AdminShell>;
}
