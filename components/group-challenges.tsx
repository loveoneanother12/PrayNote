"use client";

import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, CircleStop,
  Flame, LoaderCircle, Plus, Sparkles, Trophy, UserRoundCheck, Users, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CHALLENGE_KINDS, type ChallengeInviteMode, type ChallengeKind } from "@/lib/challenge-domain";
import type { GroupRole } from "@/lib/domain";
import { mapGroupChallengesBundleData, type ChallengeWithDetails, type GroupChallengesBundle } from "@/lib/challenge-queries";
import { ProfileDot } from "@/components/profile-dot";
import { normalizeProfileColor } from "@/lib/profile-colors";
import { createClient } from "@/lib/supabase/client";

type Props = { groupId: string; groupName: string; role: GroupRole; memberCount: number; initialBundle: GroupChallengesBundle };
const DAY_MS = 86_400_000;
function koreaDateKey() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function parseDate(value: string) { return new Date(`${value}T12:00:00Z`); }
function addDays(value: string, amount: number) { return new Date(parseDate(value).getTime() + amount * DAY_MS).toISOString().slice(0, 10); }
function inclusiveDays(start: string, end: string) { return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS) + 1; }
function dateRange(start: string, end: string) { return Array.from({ length: Math.max(0, Math.min(90, inclusiveDays(start, end))) }, (_, index) => addDays(start, index)); }
function formatDate(value: string) { const [, month, day] = value.split("-").map(Number); return `${month}월 ${day}일`; }
function weekday(value: string) { return new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" }).format(parseDate(value)); }
function defaultTitle(kind: ChallengeKind) { return kind === "prayer_relay" ? "우리의 기도를 이어가는 7일" : kind === "first_prayer" ? "모두 함께 내딛는 첫 기도" : "하루도 끊기지 않는 기도"; }
function statusLabel(challenge: ChallengeWithDetails, today: string) {
  if (challenge.status === "stopped") return "중단됨";
  if (challenge.status === "completed") return challenge.completedSuccessfully ? "함께 완주" : "함께한 기록";
  return challenge.startDate > today ? "시작 예정" : "진행 중";
}

export function GroupChallenges({ groupId, groupName, role, memberCount, initialBundle }: Props) {
  const [bundle, setBundle] = useState(initialBundle);
  const [createOpen, setCreateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const isLeader = role === "leader";
  const today = koreaDateKey();

  async function refreshBundle() {
    const { data, error } = await createClient().rpc("get_group_challenges_bundle", { target_group_id: groupId });
    if (!error) setBundle(mapGroupChallengesBundleData(data));
  }

  useEffect(() => {
    const refresh = () => { void refreshBundle(); };
    window.addEventListener("praynote:challenge-activity", refresh);
    return () => window.removeEventListener("praynote:challenge-activity", refresh);
  });

  async function run(name: string, request: () => PromiseLike<{ error: { message: string } | null }>) {
    if (pending) return false;
    setPending(name); setMessage("");
    const { error } = await request();
    if (error) {
      setMessage(error.message.includes("active_challenge_exists") ? "이미 진행 중이거나 예정된 챌린지가 있어요." : "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.");
      setPending(null); return false;
    }
    await refreshBundle(); setPending(null); return true;
  }

  async function toggleJoin(challengeId: string) { await run("join", () => createClient().rpc("toggle_challenge_participation", { target_challenge_id: challengeId })); }
  async function stop(challengeId: string) {
    if (!window.confirm("이 챌린지를 중단할까요? 지금까지의 기록은 지난 챌린지에 보존됩니다.")) return;
    await run("stop", () => createClient().rpc("stop_group_challenge", { target_challenge_id: challengeId }));
  }
  async function extend(challenge: ChallengeWithDetails) {
    const value = window.prompt(`새 종료일을 입력해주세요. 현재 종료일: ${challenge.endDate}`, addDays(challenge.endDate, 7));
    if (!value) return;
    await run("extend", () => createClient().rpc("extend_group_challenge", { target_challenge_id: challenge.id, new_end_date: value }));
  }

  return <section className="challenge-shell" aria-labelledby="group-challenge-title">
    <div className="challenge-section-heading"><div><span className="challenge-heading-icon"><Trophy size={18} /></span><div><p>함께 만드는 기도 습관</p><h2 id="group-challenge-title">기도 챌린지</h2></div></div></div>
    {message && <div className="challenge-inline-error" role="alert">{message}</div>}
    {!bundle.active ? <div className="challenge-empty"><span><Sparkles size={20} /></span><div><strong>현재 진행 중인 챌린지가 없어요.</strong><p>경쟁 없이, 서로의 기도가 이어지는 시간을 만들어보세요.</p></div>{isLeader && <button type="button" onClick={() => setCreateOpen(true)}><Plus size={15} />챌린지 만들기</button>}</div> : <ChallengeCard challenge={bundle.active} today={today} groupName={groupName} memberCount={memberCount} isLeader={isLeader} pending={pending} onJoin={() => toggleJoin(bundle.active!.id)} onStop={() => stop(bundle.active!.id)} onExtend={() => extend(bundle.active!)} />}
    <button className="challenge-history-toggle" type="button" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen}><span><CalendarDays size={15} />지난 챌린지 <em>{bundle.history.length}</em></span><ChevronDown className={historyOpen ? "open" : ""} size={16} /></button>
    {historyOpen && <div className="challenge-history-list">{bundle.history.length ? bundle.history.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} today={today} groupName={groupName} memberCount={memberCount} isLeader={false} pending={pending} onJoin={() => {}} onStop={() => {}} onExtend={() => {}} compact />) : <div className="challenge-history-empty">완료한 챌린지가 이곳에 차곡차곡 쌓여요.</div>}</div>}
    {createOpen && <CreateModal groupId={groupId} groupName={groupName} today={today} pending={pending === "create"} onClose={() => setCreateOpen(false)} onSubmit={async (input) => { const success = await run("create", () => createClient().rpc("create_group_challenge", input)); if (success) setCreateOpen(false); }} />}
  </section>;
}

function ChallengeCard({ challenge, today, groupName, memberCount, isLeader, pending, onJoin, onStop, onExtend, compact = false }: { challenge: ChallengeWithDetails; today: string; groupName: string; memberCount: number; isLeader: boolean; pending: string | null; onJoin: () => void; onStop: () => void; onExtend: () => void; compact?: boolean }) {
  const meta = CHALLENGE_KINDS[challenge.kind];
  const days = useMemo(() => dateRange(challenge.startDate, challenge.endDate), [challenge.endDate, challenge.startDate]);
  const totalDays = days.length;
  const activeDayCount = challenge.result?.activeDayCount ?? challenge.activeDays.filter((day) => days.includes(day)).length;
  const activeParticipants = challenge.participants.filter((person) => !person.leftAt);
  const participantCount = challenge.result?.participantCount ?? activeParticipants.length;
  const zeroActivityCount = activeParticipants.filter((person) => !person.hasParticipated).length;
  const progress = challenge.kind === "first_prayer" ? Math.round(((participantCount - zeroActivityCount) / Math.max(1, participantCount)) * 100) : Math.round((activeDayCount / Math.max(1, totalDays)) * 100);
  const daysRemaining = Math.max(0, inclusiveDays(today, challenge.endDate));
  const todayActive = challenge.activeDays.includes(today);
  const finished = challenge.status === "completed" || challenge.status === "stopped";
  return <article className={`challenge-card status-${challenge.status} ${compact ? "compact" : ""}`}>
    <header className="challenge-card-head"><div><div className="challenge-card-labels"><span>{meta.label}</span><em>{statusLabel(challenge, today)}</em></div><h3>{challenge.title}</h3><p>{groupName} · {formatDate(challenge.startDate)}–{formatDate(challenge.endDate)}</p></div>{!finished && <button className={`challenge-join-button ${challenge.joined ? "joined" : ""}`} type="button" onClick={onJoin} disabled={pending !== null}>{pending === "join" ? <LoaderCircle className="button-spinner" size={14} /> : challenge.joined ? <Check size={14} /> : <Plus size={14} />}{challenge.joined ? "참여 중" : "참여하기"}</button>}</header>
    {finished ? <ResultCard challenge={challenge} activeDayCount={activeDayCount} participantCount={participantCount} totalDays={totalDays} /> : <>
      <div className="challenge-progress-card"><div className="challenge-progress-copy"><div><strong>{todayActive ? "오늘도 기도가 이어졌어요" : challenge.startDate > today ? "시작을 기다리고 있어요" : "오늘의 기도를 기다리고 있어요"}</strong><span>{daysRemaining > 0 ? `${daysRemaining}일 남음` : "오늘 마감"}</span></div><p>{meta.description}</p></div><div className="challenge-progress-track"><span style={{ width: `${Math.max(progress, 2)}%` }} /></div><div className="challenge-progress-foot"><span>함께한 날 <strong>{activeDayCount}</strong>/{totalDays}</span><span>공동 진행 {progress}%</span></div></div>
      <div className="challenge-stat-grid"><div><Flame size={17} /><span><strong>{activeDayCount}일</strong><small>기도가 이어진 날</small></span></div><div><Users size={17} /><span><strong>{participantCount}명</strong><small>챌린지 참여</small></span></div><div><UserRoundCheck size={17} /><span><strong>{zeroActivityCount}명</strong><small>첫 참여를 기다려요</small></span></div></div>
      <div className="challenge-condition-list">{meta.conditions.map((condition, index) => { const elapsed = Math.max(0, Math.min(totalDays, inclusiveDays(challenge.startDate, today))); const checked = challenge.kind === "first_prayer" ? zeroActivityCount === 0 && participantCount > 0 : index === 0 ? activeDayCount >= elapsed : zeroActivityCount === 0 && participantCount > 0; return <div key={condition} className={checked ? "done" : ""}><span>{checked && <Check size={11} />}</span><p>{condition}</p></div>; })}</div>
      <ChallengeCalendar days={days} activeDays={challenge.activeDays} today={today} />
      <div className="challenge-community-row"><div><strong>함께하는 사람들</strong><span>{participantCount ? `${participantCount}명이 서로의 기도를 기억하고 있어요.` : "참여하기를 누르면 함께할 수 있어요."}</span></div><em>{Math.max(0, memberCount - participantCount)}명에게 참여 기회가 열려 있어요</em></div>
      <div className="challenge-participant-list">{activeParticipants.map((person) => <span key={person.id}><ProfileDot color={normalizeProfileColor(person.profileColor)} label={person.displayName} size="small" />{person.displayName}<small>{person.hasParticipated ? "참여 완료" : "참여 전"}</small></span>)}</div>
      {!!challenge.recentActivity.length && <div className="challenge-activity-list"><strong>최근 챌린지 활동</strong>{challenge.recentActivity.map((activity, index) => <p key={`${activity.recordedAt}-${index}`}><Flame size={12} />{activity.displayName}님이 {formatDate(activity.date)} 기도를 이어갔어요.</p>)}</div>}
      {isLeader && <div className="challenge-leader-actions"><button type="button" onClick={onExtend} disabled={pending !== null}><CalendarDays size={13} />종료일 연장</button><button className="danger" type="button" onClick={onStop} disabled={pending !== null}>{pending === "stop" ? <LoaderCircle className="button-spinner" size={13} /> : <CircleStop size={13} />}챌린지 중단</button></div>}
    </>}
  </article>;
}

function ChallengeCalendar({ days, activeDays, today }: { days: string[]; activeDays: string[]; today: string }) { return <section className="challenge-calendar" aria-label="챌린지 날짜별 현황"><div className="challenge-subheading"><strong>기도가 이어진 날</strong><span><i /> 함께한 날</span></div><div className="challenge-day-grid">{days.map((day) => <div key={day} className={`${activeDays.includes(day) ? "active" : ""} ${day === today ? "today" : ""} ${day < today && !activeDays.includes(day) ? "passed" : ""}`}><small>{weekday(day)}</small><strong>{Number(day.slice(-2))}</strong>{activeDays.includes(day) && <Flame size={10} />}</div>)}</div></section>; }

function ResultCard({ challenge, activeDayCount, participantCount, totalDays }: { challenge: ChallengeWithDetails; activeDayCount: number; participantCount: number; totalDays: number }) { const completed = challenge.completedSuccessfully; return <div className={`challenge-result ${completed ? "complete" : "recorded"}`}><span>{completed ? <Trophy size={24} /> : <Sparkles size={24} />}</span><div><p>{completed ? "CHALLENGE COMPLETE" : "OUR PRAYER RECORD"}</p><h4>{completed ? "함께 기도를 이어 완주했어요!" : "함께한 날을 소중히 기억해요."}</h4><small>{completed ? "서로의 작은 참여가 공동체의 긴 기도가 되었어요." : "다음 챌린지에서도 이 마음을 이어가요."}</small></div><dl><div><dt>함께한 날</dt><dd>{activeDayCount}/{totalDays}일</dd></div><div><dt>참여 인원</dt><dd>{participantCount}명</dd></div><div><dt>최장 연속</dt><dd>{challenge.result?.longestStreak ?? 0}일</dd></div></dl><ChallengeCalendar days={dateRange(challenge.startDate, challenge.endDate)} activeDays={challenge.activeDays} today={koreaDateKey()} /></div>; }

type CreateInput = { target_group_id: string; challenge_kind: ChallengeKind; challenge_title: string; challenge_invite_mode: ChallengeInviteMode; challenge_start_date: string; challenge_end_date: string };
function CreateModal({ groupId, groupName, today, pending, onClose, onSubmit }: { groupId: string; groupName: string; today: string; pending: boolean; onClose: () => void; onSubmit: (input: CreateInput) => void }) {
  const [step, setStep] = useState(1); const [kind, setKind] = useState<ChallengeKind>("prayer_relay"); const [duration, setDuration] = useState<7 | 14 | 30 | "custom">(7); const [startDate, setStartDate] = useState(today); const [endDate, setEndDate] = useState(addDays(today, 6)); const [title, setTitle] = useState(defaultTitle("prayer_relay")); const [inviteMode, setInviteMode] = useState<ChallengeInviteMode>("open");
  const totalDays = inclusiveDays(startDate, endDate); const valid = totalDays >= 3 && totalDays <= 90 && title.trim().length >= 2;
  function chooseKind(next: ChallengeKind) { setKind(next); setTitle(defaultTitle(next)); }
  function chooseDuration(next: 7 | 14 | 30 | "custom") { setDuration(next); if (next !== "custom") setEndDate(addDays(startDate, next - 1)); }
  function changeStart(next: string) { setStartDate(next); if (duration !== "custom") setEndDate(addDays(next, duration - 1)); }
  return createPortal(<div className="modal-backdrop challenge-create-backdrop" role="presentation" onMouseDown={pending ? undefined : onClose}><section className="composer-modal challenge-create-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-create-title" onMouseDown={(event) => event.stopPropagation()}><div className="challenge-modal-handle" /><header className="challenge-modal-head"><div><span>{groupName}</span><h2 id="challenge-create-title">기도 챌린지 만들기</h2></div><button type="button" onClick={onClose} disabled={pending} aria-label="닫기"><X size={19} /></button></header>
    <div className="challenge-stepper" aria-label={`총 3단계 중 ${step}단계`}>{[1,2,3].map((item) => <span className={item <= step ? "active" : ""} key={item}><i />{item}<small>{item === 1 ? "목표" : item === 2 ? "기간" : "확인"}</small></span>)}</div>
    {step === 1 && <div className="challenge-modal-body"><div className="challenge-modal-title"><p>STEP 1</p><h3>어떤 마음으로 함께할까요?</h3><span>순위 없이 공동체가 함께 달성할 목표를 골라주세요.</span></div><div className="challenge-kind-options">{(Object.keys(CHALLENGE_KINDS) as ChallengeKind[]).map((option) => { const item=CHALLENGE_KINDS[option]; return <button type="button" className={kind === option ? "selected" : ""} onClick={() => chooseKind(option)} key={option}><span>{option === "prayer_relay" ? <Flame size={18} /> : option === "first_prayer" ? <Users size={18} /> : <CalendarDays size={18} />}</span><div><strong>{item.label}</strong><small>{item.description}</small></div>{kind === option && <Check size={16} />}</button>; })}</div></div>}
    {step === 2 && <div className="challenge-modal-body"><div className="challenge-modal-title"><p>STEP 2</p><h3>함께할 기간을 정해주세요.</h3><span>한국시간을 기준으로 시작일과 종료일을 모두 포함해요.</span></div><div className="challenge-duration-options">{([7,14,30] as const).map((value) => <button type="button" className={duration === value ? "selected" : ""} onClick={() => chooseDuration(value)} key={value}>{value}일</button>)}<button type="button" className={duration === "custom" ? "selected" : ""} onClick={() => chooseDuration("custom")}>직접 설정</button></div><div className="challenge-date-inputs"><label><span>시작일</span><input type="date" value={startDate} min={today} onChange={(event) => changeStart(event.target.value)} /></label><ArrowRight size={17} /><label><span>종료일</span><input type="date" value={endDate} min={addDays(startDate,2)} max={addDays(startDate,89)} disabled={duration !== "custom"} onChange={(event) => setEndDate(event.target.value)} /></label></div><p className={`challenge-date-summary ${totalDays >= 3 && totalDays <= 90 ? "" : "error"}`}><CalendarDays size={15} />{totalDays >= 3 && totalDays <= 90 ? `${formatDate(startDate)}부터 ${formatDate(endDate)}까지 · 총 ${totalDays}일` : "기간은 최소 3일, 최대 90일로 설정해주세요."}</p></div>}
    {step === 3 && <div className="challenge-modal-body"><div className="challenge-modal-title"><p>STEP 3</p><h3>마지막으로 확인해주세요.</h3><span>이름과 참여 안내 방식을 정하면 바로 시작할 수 있어요.</span></div><label className="challenge-title-field"><span>챌린지 이름</span><input value={title} maxLength={50} onChange={(event) => setTitle(event.target.value)} /></label><div className="challenge-invite-options"><button type="button" className={inviteMode === "open" ? "selected" : ""} onClick={() => setInviteMode("open")}><strong>자유 참여</strong><small>그룹원이 원하는 때에 참여해요.</small></button><button type="button" className={inviteMode === "invite_all" ? "selected" : ""} onClick={() => setInviteMode("invite_all")}><strong>그룹 전체 초대</strong><small>모든 그룹원에게 참여 소식을 알려요.</small></button></div><div className="challenge-final-preview"><span><Trophy size={20} /></span><div><small>{CHALLENGE_KINDS[kind].label} · {totalDays}일</small><strong>{title || "챌린지 이름을 입력해주세요"}</strong><p>{formatDate(startDate)}–{formatDate(endDate)} · {inviteMode === "open" ? "자유 참여" : "그룹 전체 초대"}</p></div></div></div>}
    <footer className="challenge-modal-actions">{step > 1 && <button type="button" className="secondary" onClick={() => setStep((value) => value - 1)} disabled={pending}><ArrowLeft size={15} />이전</button>}{step < 3 ? <button type="button" className="primary" onClick={() => setStep((value) => value + 1)} disabled={step === 2 && (totalDays < 3 || totalDays > 90)}>다음<ArrowRight size={15} /></button> : <button type="button" className="primary" disabled={!valid || pending} onClick={() => onSubmit({ target_group_id: groupId, challenge_kind: kind, challenge_title: title.trim(), challenge_invite_mode: inviteMode, challenge_start_date: startDate, challenge_end_date: endDate })}>{pending ? <LoaderCircle className="button-spinner" size={15} /> : <Sparkles size={15} />}{pending ? "시작 중…" : "챌린지 시작"}</button>}</footer>
  </section></div>, document.body);
}
