"use client";

import { Crown, LoaderCircle, MoreVertical, ShieldCheck, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MemberManagementMenuProps = {
  groupId: string;
  userId: string;
  displayName: string;
  initialIsAdmin: boolean;
};

type PendingAction = "admin" | "leader" | "remove" | null;

export function MemberManagementMenu({ groupId, userId, displayName, initialIsAdmin }: MemberManagementMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function toggleAdmin() {
    if (pending) return;
    const next = !isAdmin;
    setPending("admin");
    setError("");
    setIsAdmin(next);
    const supabase = createClient();
    const { error: requestError } = await supabase.rpc("set_group_admin", {
      target_group_id: groupId,
      target_user_id: userId,
      make_admin: next,
    });
    if (requestError) {
      setIsAdmin(!next);
      setError("Admin 권한을 변경하지 못했어요.");
    } else {
      startTransition(() => router.refresh());
    }
    setPending(null);
  }

  async function transferLeadership() {
    if (pending || !window.confirm(`${displayName}님에게 리더 권한을 위임할까요?\n위임 후 내 역할은 Admin으로 변경됩니다.`)) return;
    setPending("leader");
    setError("");
    const supabase = createClient();
    const { error: requestError } = await supabase.rpc("transfer_group_leadership", {
      target_group_id: groupId,
      target_user_id: userId,
    });
    if (requestError) {
      setError("리더 권한을 위임하지 못했어요. 잠시 후 다시 시도해주세요.");
      setPending(null);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
    setPending(null);
  }

  async function removeMember() {
    if (pending || !window.confirm(`${displayName}님을 그룹에서 탈퇴 처리할까요?`)) return;
    setPending("remove");
    setError("");
    const supabase = createClient();
    const { error: requestError } = await supabase.rpc("remove_group_member", {
      target_group_id: groupId,
      target_user_id: userId,
    });
    if (requestError) {
      setError("멤버를 탈퇴 처리하지 못했어요.");
      setPending(null);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
    setPending(null);
  }

  return (
    <div className="member-management" ref={containerRef}>
      <button
        className="member-menu-trigger"
        type="button"
        aria-label={`${displayName} 멤버 관리`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setOpen((value) => !value); setError(""); }}
        disabled={pending !== null}
      >
        {pending ? <LoaderCircle className="button-spinner" size={18} /> : <MoreVertical size={19} />}
      </button>
      {open && (
        <div className="member-action-popover" role="menu" aria-label={`${displayName} 권한 관리`}>
          <div className="member-action-title"><strong>{displayName}</strong><span>멤버 관리</span></div>
          <button type="button" role="menuitem" onClick={toggleAdmin} disabled={pending !== null}>
            <ShieldCheck size={17} /><span>Admin 설정/해제</span><em className={isAdmin ? "on" : ""}>{isAdmin ? "ON" : "OFF"}</em>
          </button>
          <button type="button" role="menuitem" onClick={transferLeadership} disabled={pending !== null}>
            <Crown size={17} /><span>리더 권한 위임</span>
          </button>
          <button className="member-remove-action" type="button" role="menuitem" onClick={removeMember} disabled={pending !== null}>
            <UserMinus size={17} /><span>그룹 탈퇴</span>
          </button>
          {error && <p className="member-action-error" role="status">{error}</p>}
        </div>
      )}
    </div>
  );
}
