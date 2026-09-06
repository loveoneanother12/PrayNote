"use client";

import { LoaderCircle, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/settings/actions";

const initialState: DeleteAccountState = { error: "" };

export function AccountDeletion() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, initialState);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, pending]);

  return (
    <>
      <button className="danger-button withdrawal-button" type="button" onClick={() => setOpen(true)}>
        <Trash2 size={16} />회원 탈퇴
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) setOpen(false);
        }}>
          <section className="composer-modal withdrawal-modal" role="dialog" aria-modal="true" aria-labelledby="withdrawal-title">
            <div className="modal-head">
              <div><span>ACCOUNT WITHDRAWAL</span><h2 id="withdrawal-title">회원 탈퇴</h2></div>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)} disabled={pending}><X size={19} /></button>
            </div>
            <p className="withdrawal-modal-copy">탈퇴하면 로그인 계정과 개인 기도제목은 삭제됩니다. 그룹에 공유한 기도제목은 기본적으로 작성자만 <strong>“(탈퇴한 사용자)”</strong>로 바뀌어 남습니다.</p>
            <p className="withdrawal-warning">내가 리더인 그룹은 다른 활성 멤버에게 리더 권한이 이관됩니다. 이관할 멤버가 없는 그룹은 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
            <form action={action} className="withdrawal-form">
              <p>내 기도 및 그룹에 공유한 기도제목들을 일괄 삭제하시겠습니까?</p>
              <label className="withdrawal-choice">
                <input name="deleteAllPrayers" type="checkbox" value="yes" />
                <span><strong>네, 삭제하겠습니다</strong>개인기도와 그룹에 공유한 기도제목을 모두 영구 삭제합니다.</span>
              </label>
              <label className="withdrawal-choice">
                <input name="withdrawalConfirmed" type="checkbox" value="yes" required />
                <span><strong>회원 탈퇴에 동의합니다</strong>위 안내를 확인했으며 계정 삭제가 되돌릴 수 없다는 점에 동의합니다.</span>
              </label>
              {state.error && <p className="withdrawal-error" role="alert">{state.error}</p>}
              <div className="withdrawal-actions">
                <button className="cancel" type="button" onClick={() => setOpen(false)} disabled={pending}>취소</button>
                <button className={`confirm ${pending ? "button-pending" : ""}`} type="submit" disabled={pending} aria-busy={pending}>
                  {pending ? <><LoaderCircle className="button-spinner" size={15} />탈퇴 처리 중…</> : <><Trash2 size={15} />회원 탈퇴</>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
