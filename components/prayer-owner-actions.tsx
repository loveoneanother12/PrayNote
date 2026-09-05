"use client";

import { Check, LoaderCircle, Pencil, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useState } from "react";
import { SharePrayerModal } from "@/components/share-prayer-modal";
import { createClient } from "@/lib/supabase/client";

type GroupOption = { id: string; name: string };

export function PrayerOwnerActions({
  prayerId,
  initialContent,
  initialSharedGroups,
  groups,
  onContentChange,
  compact = false,
}: {
  prayerId: string;
  initialContent: string;
  initialSharedGroups: GroupOption[];
  groups: GroupOption[];
  onContentChange?: (content: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [draft, setDraft] = useState(initialContent);
  const [sharedGroups, setSharedGroups] = useState(initialSharedGroups);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextContent = draft.trim();
    if (pending || !nextContent || nextContent.length > 2000) return;
    setPending(true);
    setError("");
    const supabase = createClient();
    const { data, error: mutationError } = await supabase
      .from("prayer_requests")
      .update({ content: nextContent })
      .eq("id", prayerId)
      .select("id")
      .maybeSingle();
    if (mutationError || !data) {
      setError("기도제목을 수정하지 못했어요.");
      setPending(false);
      return;
    }
    setContent(nextContent);
    setDraft(nextContent);
    onContentChange?.(nextContent);
    setPending(false);
    setEditing(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className={`prayer-owner-actions ${compact ? "compact" : ""}`}>
        <button type="button" className="prayer-owner-button" onClick={() => { setDraft(content); setError(""); setEditing(true); }}><Pencil size={compact ? 12 : 13} />수정하기</button>
        <button type="button" className="prayer-owner-button share" onClick={() => setSharing(true)}><Share2 size={compact ? 12 : 13} />다른 그룹에도 공유하기</button>
      </div>

      {editing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !pending && setEditing(false)}>
          <div className="composer-modal prayer-edit-modal" role="dialog" aria-modal="true" aria-labelledby={`edit-prayer-${prayerId}`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="composer-heading"><div><span className="overview-icon"><Pencil size={20} /></span><div><h2 id={`edit-prayer-${prayerId}`}>기도제목 수정</h2><p>등록일과 기존 기도 기록은 그대로 유지됩니다.</p></div></div><button type="button" onClick={() => setEditing(false)} disabled={pending} aria-label="닫기">×</button></div>
            <form onSubmit={save}>
              <label htmlFor={`edit-prayer-content-${prayerId}`}>기도제목</label>
              <textarea id={`edit-prayer-content-${prayerId}`} value={draft} onChange={(event) => setDraft(event.target.value)} minLength={1} maxLength={2000} autoFocus required />
              {error && <p className="form-error" role="status">{error}</p>}
              <div className="composer-footer"><span>{draft.length} / 2,000</span><div><button type="button" className="cancel-button" onClick={() => setEditing(false)} disabled={pending}>취소</button><button type="submit" className={`primary-button ${pending ? "button-pending" : ""}`} disabled={pending || !draft.trim()}>{pending ? <><LoaderCircle className="button-spinner" size={15} />저장 중…</> : <><Check size={15} />수정 저장</>}</button></div></div>
            </form>
          </div>
        </div>
      )}

      {sharing && (
        <SharePrayerModal
          prayerId={prayerId}
          sharedGroups={sharedGroups}
          groups={groups}
          returnTo="/prayers"
          onClose={() => setSharing(false)}
          onShared={(groupIds) => setSharedGroups((current) => [
            ...current,
            ...groups.filter((group) => groupIds.includes(group.id) && !current.some((existing) => existing.id === group.id)),
          ])}
        />
      )}
    </>
  );
}
