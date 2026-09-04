"use client";

import { Check, Share2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sharePrayerWithGroups } from "@/app/prayer-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type ShareGroup = { id: string; name: string };

export function SharePrayerModal({
  prayerId,
  currentGroup,
  groups,
  returnTo,
}: {
  prayerId: string;
  currentGroup: ShareGroup;
  groups: ShareGroup[];
  returnTo: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const otherGroups = groups.filter((group) => group.id !== currentGroup.id);
  const close = () => router.replace(returnTo);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div className="composer-modal share-prayer-modal" role="dialog" aria-modal="true" aria-labelledby="share-prayer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="composer-heading">
          <div><span className="overview-icon"><Share2 size={20} /></span><div><h2 id="share-prayer-title">다른 그룹에도 공유할까요?</h2><p>방금 등록한 기도제목을 여러 공동체에 함께 나눌 수 있어요.</p></div></div>
          <button type="button" onClick={close} aria-label="닫기">×</button>
        </div>
        <form action={sharePrayerWithGroups}>
          <input type="hidden" name="prayerId" value={prayerId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="share-group-list">
            <label className="share-group-option selected disabled">
              <input type="checkbox" checked disabled readOnly />
              <span><Users size={15} /><span><strong>{currentGroup.name}</strong><small>방금 공유한 그룹</small></span></span>
              <Check size={16} />
            </label>
            {otherGroups.map((group) => (
              <label className={`share-group-option ${selected.includes(group.id) ? "selected" : ""}`} key={group.id}>
                <input
                  type="checkbox"
                  name="groupIds"
                  value={group.id}
                  checked={selected.includes(group.id)}
                  onChange={(event) => setSelected((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))}
                />
                <span><Users size={15} /><span><strong>{group.name}</strong><small>이 그룹에도 공유하기</small></span></span>
                <Check size={16} />
              </label>
            ))}
            {otherGroups.length === 0 && <p className="share-no-groups">추가로 공유할 다른 그룹이 없어요.</p>}
          </div>
          <div className="composer-footer share-footer">
            <span>나중에도 기도제목 상세 화면에서 공유 그룹을 확인할 수 있어요.</span>
            <div><button type="button" className="cancel-button" onClick={close}>지금은 안 할게요</button><PendingSubmitButton className="primary-button" pendingText="공유 중…" disabled={selected.length === 0}>선택한 그룹에 공유</PendingSubmitButton></div>
          </div>
        </form>
      </div>
    </div>
  );
}
