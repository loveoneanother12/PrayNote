"use client";

import { BookHeart, Check, ChevronDown, LoaderCircle, LockKeyhole, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { GroupSummary, PrayerSummary, ProfileColor } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

export function DashboardPrayerComposer({
  open,
  groups,
  userId,
  displayName,
  profileColor,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  groups: GroupSummary[];
  userId: string;
  displayName: string;
  profileColor: ProfileColor;
  onClose: () => void;
  onCreated: (prayers: PrayerSummary[]) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [personalPrayer, setPersonalPrayer] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const content = draft.trim();
    const targetGroupIds = personalPrayer ? [] : selectedGroupIds;
    if (!content || (!personalPrayer && targetGroupIds.length === 0)) return;

    setPending(true);
    onError("");
    const supabase = createClient();
    const { data: prayerId, error } = await supabase.rpc("create_prayer_with_groups", {
      prayer_content: content,
      target_group_ids: targetGroupIds,
      is_personal: personalPrayer,
    });
    if (error || !prayerId) {
      onError("기도제목을 등록하지 못했어요.");
      setPending(false);
      return;
    }

    const now = new Date().toISOString();
    const selectedGroups = groups.filter((group) => targetGroupIds.includes(group.id));
    const sharedGroupIds = selectedGroups.map((group) => group.id);
    const sharedGroupNames = selectedGroups.map((group) => group.name);
    const optimisticRows: PrayerSummary[] = personalPrayer
      ? [{ id: prayerId, groupId: null, groupName: "개인기도", groupIds: [], groupNames: [], isPersonal: true, authorId: userId, authorName: displayName, authorColor: profileColor, content, status: "active", responseCount: 0, hasPrayed: false, createdAt: now, completedAt: null }]
      : selectedGroups.map((group) => ({ id: prayerId, groupId: group.id, groupName: group.name, groupIds: sharedGroupIds, groupNames: sharedGroupNames, isPersonal: false, authorId: userId, authorName: displayName, authorColor: profileColor, content, status: "active" as const, responseCount: 0, hasPrayed: false, createdAt: now, completedAt: null }));

    onCreated(optimisticRows);
    setDraft("");
    setSelectedGroupIds([]);
    setPersonalPrayer(false);
    setPending(false);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !pending && onClose()}>
      <div className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="composer-heading"><div><span className="overview-icon"><BookHeart size={21} /></span><div><h2 id="composer-title">기도제목 나누기</h2><p>등록 날짜는 한국시간 기준으로 자동 저장됩니다.</p></div></div><button onClick={onClose} disabled={pending} aria-label="닫기">×</button></div>
        <form onSubmit={submit}>
          <label>공유할 그룹 <span className="optional-label">다중선택 가능</span></label>
          <button
            className={`composer-group-trigger ${groupsOpen ? "open" : ""}`}
            type="button"
            onClick={() => setGroupsOpen((current) => !current)}
            aria-expanded={groupsOpen}
            aria-controls="composer-group-options"
            disabled={personalPrayer}
          >
            <span><Users size={17} /><span><strong>{selectedGroupIds.length > 0 ? `${selectedGroupIds.length}개 그룹 선택됨` : "그룹 선택하기"}</strong><small>{selectedGroupIds.length > 0 ? groups.filter((group) => selectedGroupIds.includes(group.id)).map((group) => group.name).join(", ") : "눌러서 공유할 그룹을 골라주세요."}</small></span></span>
            <ChevronDown size={18} />
          </button>
          <div id="composer-group-options" className={`composer-group-collapse ${groupsOpen && !personalPrayer ? "open" : ""}`}>
            <div className="composer-group-options">
              {groups.length === 0 && <span className="composer-no-groups">가입된 그룹이 없어도 개인기도로 저장할 수 있어요.</span>}
              {groups.map((group) => (
                <label className="composer-group-option" key={group.id}>
                  <input type="checkbox" name="groupIds" value={group.id} checked={selectedGroupIds.includes(group.id)} disabled={personalPrayer} onChange={(event) => setSelectedGroupIds((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))} />
                  <span>{group.name}</span><Check size={14} />
                </label>
              ))}
            </div>
          </div>
          <label className="personal-prayer-toggle">
            <span><LockKeyhole size={17} /><span><strong>혼자 보는 개인 기도제목인가요?</strong><small>켜면 어떤 그룹에도 공유되지 않고 나만 볼 수 있어요.</small></span></span>
            <input type="checkbox" name="personal" checked={personalPrayer} onChange={(event) => { setPersonalPrayer(event.target.checked); if (event.target.checked) setGroupsOpen(false); }} />
            <span className="switch" aria-hidden="true" />
          </label>
          <label htmlFor="prayer-content">함께 기도받고 싶은 내용을 적어주세요</label>
          <textarea id="prayer-content" name="content" autoFocus maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="솔직한 마음을 편안하게 나눠주세요." required />
          <div className="composer-footer"><span>{draft.length} / 2,000</span><div><button type="button" className="cancel-button" onClick={onClose} disabled={pending}>취소</button><button className={`primary-button ${pending ? "button-pending" : ""}`} type="submit" disabled={pending || !draft.trim() || (!personalPrayer && selectedGroupIds.length === 0)}>{pending ? <><LoaderCircle className="button-spinner" size={15} />등록 중…</> : "기도제목 등록"}</button></div></div>
        </form>
      </div>
    </div>
  );
}
