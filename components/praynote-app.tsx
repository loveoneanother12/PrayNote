"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useState } from "react";
import {
  Bell,
  BookHeart,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Home,
  LockKeyhole,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { InstantPrayerButton } from "@/components/instant-prayer-actions";
import { NotificationListItem } from "@/components/notification-list-item";
import { NotificationRealtime } from "@/components/notification-realtime";
import { MobileNav } from "@/components/mobile-nav";
import { formatKoreaDate } from "@/lib/dates";
import type { GroupSummary, NotificationSummary, PrayerSummary } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

type PrayNoteAppProps = {
  displayName: string;
  email: string;
  groups: GroupSummary[];
  prayers: PrayerSummary[];
  notifications: NotificationSummary[];
  userId: string;
  todayLabel: string;
  unreadNotificationCount: number;
  created?: string;
  error?: string;
  initialComposerOpen?: boolean;
};

const roleLabels = { leader: "LEADER", admin: "ADMIN", member: "MEMBER" } as const;
const groupTones = ["blue", "sage", "lavender"];

export function PrayNoteApp({ displayName, email, groups: initialGroups, prayers: initialPrayers, notifications, userId, todayLabel, unreadNotificationCount, created, error, initialComposerOpen = false }: PrayNoteAppProps) {
  const router = useRouter();
  const [opened, setOpened] = useState(true);
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [personalPrayer, setPersonalPrayer] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [optimisticGroups, setOptimisticGroups] = useState<GroupSummary[]>([]);
  const [optimisticPrayers, setOptimisticPrayers] = useState<PrayerSummary[]>([]);
  const [submitting, setSubmitting] = useState<"prayer" | "group" | null>(null);
  const [localToast, setLocalToast] = useState("");
  const [localError, setLocalError] = useState("");
  const serverToast = created === "group" ? "새 그룹을 만들었어요" : created === "prayer" ? "기도제목을 나눴어요" : created === "left" ? "그룹에서 탈퇴했어요" : created === "deleted" ? "그룹을 삭제했어요" : "";
  const toast = localToast || serverToast;
  const visibleError = localError || error;
  const groups = [...initialGroups, ...optimisticGroups.filter((optimistic) => !initialGroups.some((group) => group.id === optimistic.id))];
  const prayers = [...optimisticPrayers.filter((optimistic) => !initialPrayers.some((prayer) => prayer.id === optimistic.id && prayer.groupId === optimistic.groupId)), ...initialPrayers];
  const initials = displayName.trim().slice(0, 2).toUpperCase();
  const activeCount = new Set(prayers.map((prayer) => prayer.id)).size;
  const personalPrayers = prayers.filter((prayer) => prayer.isPersonal);

  async function submitPrayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const content = draft.trim();
    const targetGroupIds = personalPrayer ? [] : selectedGroupIds;
    if (!content || (!personalPrayer && targetGroupIds.length === 0)) return;

    setSubmitting("prayer");
    setLocalError("");
    const supabase = createClient();
    const { data: prayerId, error: mutationError } = await supabase.rpc("create_prayer_with_groups", {
      prayer_content: content,
      target_group_ids: targetGroupIds,
      is_personal: personalPrayer,
    });

    if (mutationError || !prayerId) {
      setLocalError("기도제목을 등록하지 못했어요.");
      setSubmitting(null);
      return;
    }

    const now = new Date().toISOString();
    const selectedGroups = groups.filter((group) => targetGroupIds.includes(group.id));
    const sharedGroupIds = selectedGroups.map((group) => group.id);
    const sharedGroupNames = selectedGroups.map((group) => group.name);
    const optimisticRows: PrayerSummary[] = personalPrayer
      ? [{ id: prayerId, groupId: null, groupName: "개인기도", groupIds: [], groupNames: [], isPersonal: true, authorId: userId, authorName: displayName, content, status: "active", responseCount: 0, hasPrayed: false, createdAt: now, completedAt: null }]
      : selectedGroups.map((group) => ({ id: prayerId, groupId: group.id, groupName: group.name, groupIds: sharedGroupIds, groupNames: sharedGroupNames, isPersonal: false, authorId: userId, authorName: displayName, content, status: "active" as const, responseCount: 0, hasPrayed: false, createdAt: now, completedAt: null }));
    setOptimisticPrayers((current) => [...optimisticRows, ...current]);
    setDraft("");
    setSelectedGroupIds([]);
    setPersonalPrayer(false);
    setComposerOpen(false);
    setLocalToast("기도제목을 나눴어요");
    setSubmitting(null);
    startTransition(() => router.refresh());
  }

  async function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (name.length < 2) return;

    setSubmitting("group");
    setLocalError("");
    const supabase = createClient();
    const { data: groupId, error: mutationError } = await supabase.rpc("create_group", {
      group_name: name,
      group_description: description || null,
    });
    if (mutationError || !groupId) {
      setLocalError("그룹을 만들지 못했어요.");
      setSubmitting(null);
      return;
    }

    setOptimisticGroups((current) => [...current, { id: groupId, name, description: description || null, role: "leader", memberCount: 1, unreadCount: 0 }]);
    setGroupModalOpen(false);
    setLocalToast("새 그룹을 만들었어요");
    setSubmitting(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="주요 메뉴">
        <a className="brand" href="#top" aria-label="PrayNote 홈">
          <span className="brand-mark"><BookHeart size={22} strokeWidth={2.2} /></span>
          <span>PrayNote</span>
        </a>

        <nav className="side-nav">
          <a className="nav-item active" href="#top"><Home size={19} />홈</a>
          <a className="nav-item" href="#groups"><Users size={19} />내 그룹</a>
          <Link className="nav-item" href="/prayers"><BookHeart size={19} />내 기도</Link>
          <Link className="nav-item" href="/notifications"><Bell size={19} />알림{unreadNotificationCount > 0 && <span className="nav-count">{unreadNotificationCount}</span>}</Link>
        </nav>

        <div className="side-spacer" />
        <Link className="nav-item" href="/settings"><Settings size={19} />설정</Link>
        <div className="profile-mini">
          <div className="avatar avatar-me">{initials}</div>
          <div><strong>{displayName}</strong><span>{email}</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <main id="top" className="main-content">
        <header className="topbar">
          <a className="mobile-brand" href="#top"><span className="brand-mark"><BookHeart size={19} /></span>PrayNote</a>
          <form className="search-box" action="/search" method="get"><Search size={18} /><input name="q" aria-label="기도제목 검색" placeholder="기도제목 검색" /><kbd>⌘ K</kbd></form>
          <Link className="icon-button notification-button" href="/notifications" aria-label={`읽지 않은 알림 ${unreadNotificationCount}개`}><Bell size={20} />{unreadNotificationCount > 0 && <span />}</Link>
          <div className="avatar avatar-me top-avatar">{initials}</div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <p className="eyebrow"><Sparkles size={15} />{todayLabel} · 오늘도 함께하는 기도</p>
              <h1>평안한 하루예요, {displayName}님.</h1>
              <p>서로의 마음을 기억하고, 작은 기도로 오늘을 이어가요.</p>
            </div>
            <button className="primary-button" onClick={() => setComposerOpen(true)}><Plus size={19} />기도제목 나누기</button>
          </section>

          <section className="prayer-overview" id="prayers">
            <button
              className="overview-trigger"
              type="button"
              aria-expanded={opened}
              onClick={() => setOpened((value) => !value)}
            >
              <span className="overview-icon"><BookHeart size={22} /></span>
              <span className="overview-title"><strong>기도제목 열어보기</strong><small>개인기도와 {groups.length}개 그룹의 기도제목 {activeCount}개가 있어요</small></span>
              {activeCount > 0 && <span className="unread-chip">새 기도 {activeCount}</span>}
              <ChevronDown className={opened ? "chevron-open" : ""} size={21} />
            </button>

            {opened && (
              <div className="overview-body">
                {groups.length === 0 && <div className="section-heading compact"><div><h2>아직 그룹이 없어요</h2><span>그룹을 만들거나 초대받아 참여해보세요.</span></div></div>}
                {personalPrayers.length > 0 && (
                  <section className="dashboard-group-prayers personal-prayer-section">
                    <div className="section-heading compact"><div><h2><LockKeyhole size={16} />개인기도</h2><span>나만 볼 수 있는 기도제목 {personalPrayers.length}개</span></div><Link className="text-button" href="/prayers">모두 보기 <ChevronRight size={16} /></Link></div>
                    <div className="prayer-list">
                      {personalPrayers.slice(0, 3).map((prayer, index) => (
                        <article className="prayer-card" key={prayer.id}>
                          <div className={`avatar avatar-${index % 3}`}>{prayer.authorName.slice(0, 2)}</div>
                          <div className="prayer-copy">
                            <div className="prayer-meta"><strong>나</strong><span>·</span><span>{formatKoreaDate(prayer.createdAt)} 등록</span></div>
                            <Link className="dashboard-prayer-link" href={`/prayers/${prayer.id}`}>{prayer.content}</Link>
                            <InstantPrayerButton prayerId={prayer.id} initialHasPrayed={prayer.hasPrayed} initialResponseCount={prayer.responseCount} className="pray-button" />
                          </div>
                          <Link className="more-button" href={`/prayers/${prayer.id}`} aria-label="개인 기도제목 자세히 보기"><ChevronRight size={19} /></Link>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                {groups.map((group) => {
                  const allGroupPrayers = prayers.filter((prayer) => prayer.groupId === group.id);
                  const groupPrayers = allGroupPrayers.slice(0, 3);
                  return (
                    <section className="dashboard-group-prayers" key={group.id}>
                      <div className="section-heading compact"><div><h2>{group.name}</h2><span>진행 중인 기도제목 {allGroupPrayers.length}개</span></div><Link className="text-button" href={`/groups/${group.id}`}>모두 보기 <ChevronRight size={16} /></Link></div>
                      <div className="prayer-list">
                        {groupPrayers.length === 0 && <div className="empty-prayers compact"><BookHeart size={22} /><strong>아직 진행 중인 기도제목이 없어요</strong></div>}
                        {groupPrayers.map((prayer, index) => (
                          <article className="prayer-card" key={prayer.id}>
                            <div className={`avatar avatar-${index % 3}`}>{prayer.authorName.slice(0, 2)}</div>
                            <div className="prayer-copy">
                              <div className="prayer-meta"><strong>{prayer.authorName}</strong><span>·</span><span>{formatKoreaDate(prayer.createdAt)} 등록</span></div>
                              <Link className="dashboard-prayer-link" href={`/prayers/${prayer.id}`}>{prayer.content}</Link>
                              <InstantPrayerButton prayerId={prayer.id} initialHasPrayed={prayer.hasPrayed} initialResponseCount={prayer.responseCount} className="pray-button" />
                            </div>
                            <Link className="more-button" href={`/prayers/${prayer.id}`} aria-label={`${prayer.authorName}님의 기도제목 자세히 보기`}><ChevronRight size={19} /></Link>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </section>

          <section className="groups-section" id="groups">
            <div className="section-heading">
              <div><h2>내 그룹</h2><span>함께 기도하고 있는 공동체예요</span></div>
              <button className="outline-button" onClick={() => setGroupModalOpen(true)}><Plus size={17} />그룹 만들기</button>
            </div>
            <div className="group-grid">
              {groups.map((group, index) => (
                <Link className="group-card" href={`/groups/${group.id}`} key={group.id}>
                  <div className={`group-symbol ${groupTones[index % groupTones.length]}`}><Users size={22} /></div>
                  <div className="group-card-top">
                    <span className="role-label">{roleLabels[group.role]}</span>
                    {group.unreadCount > 0 && <span className="group-unread">{group.unreadCount}</span>}
                  </div>
                  <div className="group-copy"><strong>{group.name}</strong><span>멤버 {group.memberCount}명</span></div>
                  <ChevronRight size={19} />
                </Link>
              ))}
              <Link className="group-card join-card" href="/join">
                <span className="join-plus"><Plus size={22} /></span>
                <span><strong>새 그룹에 참여하기</strong><small>초대코드로 가입 신청</small></span>
              </Link>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="activity-panel" id="notifications">
              <div className="section-heading compact"><div><h2>최근 소식</h2></div><Link className="text-button" href="/notifications">모두 보기 <ChevronRight size={16} /></Link></div>
              <div className="dashboard-notifications">
                {notifications.slice(0, 3).map((notification) => <NotificationListItem key={notification.id} notification={notification} compact />)}
                {notifications.length === 0 && <div className="empty-activity"><Bell size={20} /><span>새로운 소식이 생기면 알려드릴게요.</span></div>}
              </div>
            </div>
            <div className="verse-card">
              <span>오늘의 말씀</span>
              <blockquote>“소망 중에 즐거워하며<br />환난 중에 참으며<br />기도에 항상 힘쓰며”</blockquote>
              <cite>로마서 12:12</cite>
            </div>
          </section>
        </div>
      </main>

      <MobileNav active="home" onCreatePrayer={() => setComposerOpen(true)} />

      <NotificationRealtime userId={userId} />

      {composerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setComposerOpen(false)}>
          <div className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="composer-heading"><div><span className="overview-icon"><BookHeart size={21} /></span><div><h2 id="composer-title">기도제목 나누기</h2><p>등록 날짜는 한국시간 기준으로 자동 저장됩니다.</p></div></div><button onClick={() => setComposerOpen(false)} aria-label="닫기">×</button></div>
            <form onSubmit={submitPrayer}>
              <label>그룹을 선택해주세요 <span className="optional-label">다중선택 가능</span></label>
              <div className={`composer-group-options ${personalPrayer ? "disabled" : ""}`} aria-disabled={personalPrayer}>
                {groups.length === 0 && <span className="composer-no-groups">가입된 그룹이 없어도 개인기도로 저장할 수 있어요.</span>}
                {groups.map((group) => (
                  <label className="composer-group-option" key={group.id}>
                    <input
                      type="checkbox"
                      name="groupIds"
                      value={group.id}
                      checked={selectedGroupIds.includes(group.id)}
                      disabled={personalPrayer}
                      onChange={(event) => setSelectedGroupIds((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))}
                    />
                    <span>{group.name}</span><Check size={14} />
                  </label>
                ))}
              </div>
              <label className="personal-prayer-toggle">
                <span><LockKeyhole size={17} /><span><strong>혼자 보는 개인 기도제목인가요?</strong><small>켜면 어떤 그룹에도 공유되지 않고 나만 볼 수 있어요.</small></span></span>
                <input type="checkbox" name="personal" checked={personalPrayer} onChange={(event) => setPersonalPrayer(event.target.checked)} />
                <span className="switch" aria-hidden="true" />
              </label>
              <label htmlFor="prayer-content">함께 기도받고 싶은 내용을 적어주세요</label>
              <textarea id="prayer-content" name="content" autoFocus maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="솔직한 마음을 편안하게 나눠주세요." required />
              <div className="composer-footer"><span>{draft.length} / 2,000</span><div><button type="button" className="cancel-button" onClick={() => setComposerOpen(false)} disabled={submitting !== null}>취소</button><button className={`primary-button ${submitting === "prayer" ? "button-pending" : ""}`} type="submit" disabled={submitting !== null || !draft.trim() || (!personalPrayer && selectedGroupIds.length === 0)}>{submitting === "prayer" ? <><LoaderCircle className="button-spinner" size={15} />등록 중…</> : "기도제목 등록"}</button></div></div>
            </form>
          </div>
        </div>
      )}

      {groupModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setGroupModalOpen(false)}>
          <div className="composer-modal group-modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="composer-heading"><div><span className="overview-icon"><Users size={21} /></span><div><h2 id="group-modal-title">새 그룹 만들기</h2><p>함께 기도할 공동체를 시작해보세요.</p></div></div><button onClick={() => setGroupModalOpen(false)} aria-label="닫기">×</button></div>
            <form onSubmit={submitGroup}>
              <label htmlFor="group-name">그룹 이름</label>
              <input id="group-name" name="name" minLength={2} maxLength={50} autoFocus required placeholder="예: 청년부 셀모임" />
              <label htmlFor="group-description">그룹 소개 <span className="optional-label">선택</span></label>
              <textarea id="group-description" name="description" maxLength={500} placeholder="그룹을 간단히 소개해주세요." />
              <div className="composer-footer"><span>개설자는 자동으로 리더가 됩니다.</span><div><button type="button" className="cancel-button" onClick={() => setGroupModalOpen(false)} disabled={submitting !== null}>취소</button><button className={`primary-button ${submitting === "group" ? "button-pending" : ""}`} type="submit" disabled={submitting !== null}>{submitting === "group" ? <><LoaderCircle className="button-spinner" size={15} />만드는 중…</> : "그룹 만들기"}</button></div></div>
            </form>
          </div>
        </div>
      )}

      {(toast || visibleError) && <div className={`toast ${visibleError ? "error-toast" : ""}`} role="status">{visibleError ? <CircleAlert size={17} /> : <Check size={17} />}{toast || (visibleError === "invalid-group" ? "그룹 이름을 확인해주세요." : visibleError)}</div>}
    </div>
  );
}
