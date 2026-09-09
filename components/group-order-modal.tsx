"use client";

import { ArrowDown, ArrowUp, GripVertical, LoaderCircle, Users, X } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GroupSummary } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

type GroupOrderModalProps = {
  groups: GroupSummary[];
  onClose: () => void;
  onSaved: (orderedIds: string[]) => void;
};

function moveItem(groups: GroupSummary[], sourceIndex: number, targetIndex: number) {
  if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || targetIndex >= groups.length) return groups;
  const next = [...groups];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function GroupOrderModal({ groups, onClose, onSaved }: GroupOrderModalProps) {
  const [draft, setDraft] = useState(groups);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const draggedIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.body.classList.add("modal-open");
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  function reorderWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    setDraft((current) => moveItem(current, index, index + (event.key === "ArrowUp" ? -1 : 1)));
  }

  function startDragging(event: PointerEvent<HTMLButtonElement>, groupId: string) {
    if (saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedIdRef.current = groupId;
    setDraggedId(groupId);
  }

  function continueDragging(event: PointerEvent<HTMLButtonElement>) {
    const activeId = draggedIdRef.current;
    if (!activeId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-group-order-id]");
    const targetId = target?.dataset.groupOrderId;
    if (!targetId || targetId === activeId) return;
    setDraft((current) => {
      const sourceIndex = current.findIndex((group) => group.id === activeId);
      const targetIndex = current.findIndex((group) => group.id === targetId);
      return moveItem(current, sourceIndex, targetIndex);
    });
  }

  function stopDragging() {
    draggedIdRef.current = null;
    setDraggedId(null);
  }

  async function saveOrder() {
    if (saving) return;
    setSaving(true);
    setError("");
    const orderedIds = draft.map((group) => group.id);
    const { error: saveError } = await createClient().rpc("reorder_my_groups", { ordered_group_ids: orderedIds });
    if (saveError) {
      setError("순서를 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      setSaving(false);
      return;
    }
    onSaved(orderedIds);
    setSaving(false);
    onClose();
  }

  return createPortal(
    <div className="modal-backdrop group-order-backdrop" role="presentation" onMouseDown={() => !saving && onClose()}>
      <section className="composer-modal group-order-modal" role="dialog" aria-modal="true" aria-labelledby="group-order-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span>GROUP ORDER</span><h2 id="group-order-title">그룹 순서 수정</h2></div>
          <button type="button" aria-label="닫기" onClick={onClose} disabled={saving}><X size={19} /></button>
        </div>
        <p className="group-order-intro">왼쪽 손잡이를 누른 채 원하는 위치로 끌어보세요. 저장한 순서는 그룹 탭과 메인 화면에 함께 적용됩니다.</p>
        <ol className="group-order-list">
          {draft.map((group, index) => (
            <li className={draggedId === group.id ? "dragging" : ""} data-group-order-id={group.id} key={group.id}>
              <button
                className="group-drag-handle"
                type="button"
                aria-label={`${group.name} 순서 이동. 위아래 방향키 또는 드래그로 이동`}
                onKeyDown={(event) => reorderWithKeyboard(event, index)}
                onPointerDown={(event) => startDragging(event, group.id)}
                onPointerMove={continueDragging}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
                disabled={saving}
              >
                <GripVertical size={20} />
              </button>
              <span className="group-order-icon"><Users size={17} /></span>
              <div><strong>{group.name}</strong><small>{group.memberCount}명 · 기도 {group.prayerCount ?? 0}개</small></div>
              <span className="group-order-position">{index + 1}</span>
              <span className="group-order-keyboard-hint" aria-hidden="true"><ArrowUp size={12} /><ArrowDown size={12} /></span>
            </li>
          ))}
        </ol>
        {error && <p className="group-order-error" role="alert">{error}</p>}
        <div className="group-order-actions">
          <button className="cancel-button" type="button" onClick={onClose} disabled={saving}>취소</button>
          <button className={`primary-button ${saving ? "button-pending" : ""}`} type="button" onClick={() => void saveOrder()} disabled={saving}>{saving ? <><LoaderCircle className="button-spinner" size={15} />저장 중…</> : "순서 저장"}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
