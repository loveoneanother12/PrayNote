"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Check, ChevronRight, CircleAlert, KeyRound, ListOrdered, LoaderCircle, Plus, Users, X } from "lucide-react";
import { GroupOrderModal } from "@/components/group-order-modal";
import type { GroupSummary } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

type GroupsDashboardProps = {
  initialGroups: GroupSummary[];
};

const roleLabels = { leader: "리더", admin: "관리자", member: "멤버" } as const;
const groupTones = ["blue", "sage", "lavender"];

export function GroupsDashboard({ initialGroups }: GroupsDashboardProps) {
  const [groups, setGroups] = useState<GroupSummary[]>(initialGroups);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (name.length < 2) {
      setError("그룹 이름을 2자 이상 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const { data: groupId, error: mutationError } = await supabase.rpc("create_group", {
      group_name: name,
      group_description: description || null,
    });

    if (mutationError || !groupId) {
      setError("그룹을 만들지 못했어요. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
      return;
    }

    setGroups((current) => [
      ...current,
      { id: groupId, name, description: description || null, role: "leader", memberCount: 1, unreadCount: 0, prayerCount: 0 },
    ]);
    formElement.reset();
    setModalOpen(false);
    setMessage("새 그룹을 만들었어요.");
    setSubmitting(false);
  }

  return (
    <>
      <section className="groups-dashboard-hero">
        <div className="groups-dashboard-title">
          <span className="groups-dashboard-icon"><Users size={25} /></span>
          <div><p>함께 기도하는 공동체</p><h1>내 그룹</h1><span>가입한 그룹을 선택해 기도제목과 멤버 소식을 확인하세요.</span></div>
        </div>
        <div className="groups-dashboard-actions">
          <Link className="outline-button" href="/join"><KeyRound size={17} />초대코드로 참여</Link>
          <button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Plus size={18} />그룹 만들기</button>
        </div>
      </section>

      {(message || error) && <div className={`page-notice ${error ? "error" : ""}`} role="status">{error ? <CircleAlert size={16} /> : <Check size={16} />}{error || message}</div>}

      <section className="groups-dashboard-section">
        <div className="section-heading groups-dashboard-heading">
          <div><h2>가입한 그룹</h2><span>총 {groups.length}개의 공동체와 함께하고 있어요.</span></div>
          {groups.length > 1 && <button className="group-order-trigger" type="button" onClick={() => setOrderModalOpen(true)}><ListOrdered size={15} />순서 수정</button>}
        </div>
        <div className="group-grid groups-dashboard-grid">
          {groups.map((group, index) => (
            <Link className="group-card groups-dashboard-card" href={`/groups/${group.id}`} key={group.id}>
              <div className={`group-symbol ${groupTones[index % groupTones.length]}`}><Users size={22} /></div>
              <div className="group-card-top">
                <span className="role-label">{roleLabels[group.role]}</span>
                {group.unreadCount > 0 && <span className="group-unread">{group.unreadCount}</span>}
              </div>
              <div className="group-copy">
                <strong>{group.name}</strong>
                <span>{group.description || "함께 기도하는 PrayNote 그룹"}</span>
              </div>
              <div className="groups-dashboard-meta"><span>멤버 {group.memberCount}명</span><span>진행 중 기도 {group.prayerCount ?? 0}개</span></div>
              <ChevronRight size={19} />
            </Link>
          ))}

          <Link className="group-card join-card groups-dashboard-card" href="/join">
            <span className="join-plus"><Plus size={22} /></span>
            <span><strong>새 그룹에 참여하기</strong><small>초대코드로 가입을 신청하세요.</small></span>
          </Link>
        </div>
        {groups.length === 0 && <p className="groups-dashboard-empty">아직 가입한 그룹이 없어요. 새 그룹을 만들거나 초대코드로 참여해보세요.</p>}
      </section>

      {orderModalOpen && <GroupOrderModal
        groups={groups}
        onClose={() => setOrderModalOpen(false)}
        onSaved={(orderedIds) => {
          setGroups((current) => orderedIds.map((id) => current.find((group) => group.id === id)).filter((group): group is GroupSummary => Boolean(group)));
          setMessage("그룹 순서를 저장했어요.");
        }}
      />}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !submitting && setModalOpen(false)}>
          <div className="composer-modal group-modal" role="dialog" aria-modal="true" aria-labelledby="groups-create-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="composer-heading">
              <div><span className="overview-icon"><Users size={21} /></span><div><h2 id="groups-create-title">새 그룹 만들기</h2><p>함께 기도할 공동체를 시작해보세요.</p></div></div>
              <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} aria-label="닫기"><X size={20} /></button>
            </div>
            <form onSubmit={submitGroup}>
              <label htmlFor="groups-create-name">그룹 이름</label>
              <input id="groups-create-name" name="name" minLength={2} maxLength={50} autoFocus required placeholder="예: 청년부 셀모임" />
              <label htmlFor="groups-create-description">그룹 소개 <span className="optional-label">선택</span></label>
              <textarea id="groups-create-description" name="description" maxLength={500} placeholder="그룹을 간단히 소개해주세요." />
              <div className="composer-footer"><span>개설자는 자동으로 리더가 됩니다.</span><div><button type="button" className="cancel-button" onClick={() => setModalOpen(false)} disabled={submitting}>취소</button><button className={`primary-button ${submitting ? "button-pending" : ""}`} type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="button-spinner" size={15} />만드는 중…</> : "그룹 만들기"}</button></div></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
