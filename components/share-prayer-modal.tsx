"use client";

import { Check, LoaderCircle, Share2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ShareGroup = { id: string; name: string };

export function SharePrayerModal({
  prayerId,
  currentGroup,
  groups,
  returnTo,
  onClose,
}: {
  prayerId: string;
  currentGroup: ShareGroup;
  groups: ShareGroup[];
  returnTo: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const otherGroups = groups.filter((group) => group.id !== currentGroup.id);
  const close = () => onClose ? onClose() : router.replace(returnTo);

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || selected.length === 0) return;
    setPending(true);
    setError("");
    const supabase = createClient();
    const { error: mutationError } = await supabase.rpc("share_prayer_with_groups", {
      target_prayer_id: prayerId,
      target_group_ids: selected,
    });
    if (mutationError) {
      setError("선택한 그룹에 공유하지 못했어요.");
      setPending(false);
      return;
    }
    setPending(false);
    close();
    startTransition(() => router.refresh());
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div className="composer-modal share-prayer-modal" role="dialog" aria-modal="true" aria-labelledby="share-prayer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="composer-heading">
          <div><span className="overview-icon"><Share2 size={20} /></span><div><h2 id="share-prayer-title">다른 그룹에도 공유할까요?</h2><p>방금 등록한 기도제목을 여러 공동체에 함께 나눌 수 있어요.</p></div></div>
          <button type="button" onClick={close} aria-label="닫기">×</button>
        </div>
        <form onSubmit={share}>
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
          {error && <p className="form-error" role="status">{error}</p>}
          <div className="composer-footer share-footer">
            <span>나중에도 기도제목 상세 화면에서 공유 그룹을 확인할 수 있어요.</span>
            <div><button type="button" className="cancel-button" onClick={close} disabled={pending}>지금은 안 할게요</button><button className={`primary-button ${pending ? "button-pending" : ""}`} type="submit" disabled={pending || selected.length === 0}>{pending ? <><LoaderCircle className="button-spinner" size={15} />공유 중…</> : "선택한 그룹에 공유"}</button></div>
          </div>
        </form>
      </div>
    </div>
  );
}
