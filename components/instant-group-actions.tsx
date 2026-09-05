"use client";

import Link from "next/link";
import { Check, KeyRound, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function InstantMembershipReview({ membershipId }: { membershipId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);

  async function review(approve: boolean) {
    if (pending || result) return;
    setPending(approve ? "approve" : "reject");
    const supabase = createClient();
    const { error } = await supabase.rpc("review_membership", { membership_id: membershipId, approve });
    if (!error) {
      setResult(approve ? "approved" : "rejected");
      startTransition(() => router.refresh());
    }
    setPending(null);
  }

  if (result) return <span className={`review-result ${result}`}>{result === "approved" ? <><Check size={14} />승인 완료</> : <><X size={14} />거절 완료</>}</span>;

  return (
    <div className="membership-actions">
      <button className={`reject-button ${pending === "reject" ? "button-pending" : ""}`} type="button" onClick={() => review(false)} disabled={pending !== null}>{pending === "reject" ? <LoaderCircle className="button-spinner" size={14} /> : <X size={15} />}거절</button>
      <button className={`approve-button ${pending === "approve" ? "button-pending" : ""}`} type="button" onClick={() => review(true)} disabled={pending !== null}>{pending === "approve" ? <LoaderCircle className="button-spinner" size={14} /> : <Check size={15} />}승인</button>
    </div>
  );
}

export function InstantAdminRoleButton({ groupId, userId, initialIsAdmin }: { groupId: string; userId: string; initialIsAdmin: boolean }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [pending, setPending] = useState(false);

  async function changeRole() {
    if (pending) return;
    const next = !isAdmin;
    setIsAdmin(next);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_group_admin", { target_group_id: groupId, target_user_id: userId, make_admin: next });
    if (error) setIsAdmin(!next);
    else startTransition(() => router.refresh());
    setPending(false);
  }

  return <button className={`role-action-button ${pending ? "button-pending" : ""}`} type="button" onClick={changeRole} disabled={pending}>{pending && <LoaderCircle className="button-spinner" size={14} />}{isAdmin ? "Admin 해제" : "Admin 지정"}</button>;
}

export function InstantGroupSettingsForm({ groupId, initialName, initialDescription }: { groupId: string; initialName: string; initialDescription: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    if (name.length < 2 || name.length > 50 || description.length > 500) return;
    setPending(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("update_group_details", { target_group_id: groupId, group_name: name, group_description: description || null });
    setMessage(error ? "저장하지 못했어요." : "저장했어요.");
    setPending(false);
    if (!error) startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={save} className="settings-form">
      <label htmlFor="manage-name">그룹 이름</label><input id="manage-name" name="name" defaultValue={initialName} minLength={2} maxLength={50} required />
      <label htmlFor="manage-description">그룹 소개</label><textarea id="manage-description" name="description" defaultValue={initialDescription} maxLength={500} />
      {message && <span className="inline-save-message" role="status">{message}</span>}
      <button className={`primary-button ${pending ? "button-pending" : ""}`} type="submit" disabled={pending}>{pending ? <><LoaderCircle className="button-spinner" size={15} />저장 중…</> : "변경사항 저장"}</button>
    </form>
  );
}

export function InstantJoinForm({ groupId }: { groupId?: string }) {
  const [pending, setPending] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState("");

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const inviteCode = String(form.get("inviteCode") ?? "").trim().toUpperCase();
    if (!/^PRAY-[A-F0-9]{8}$/.test(inviteCode)) {
      setError("초대코드가 올바르지 않아요.");
      return;
    }
    setPending(true);
    setError("");
    const supabase = createClient();
    const result = groupId
      ? await supabase.rpc("request_group_membership", { target_group_id: groupId, submitted_code: inviteCode })
      : await supabase.rpc("request_group_membership_by_code", { submitted_code: inviteCode });
    if (result.error) setError(result.error.message.includes("invalid_invite_code") ? "초대코드가 일치하지 않아요." : "가입 신청을 보내지 못했어요.");
    else setRequested(true);
    setPending(false);
  }

  if (requested) return <div className="join-result success"><strong>가입 신청을 보냈어요</strong><span>리더 또는 관리자가 승인하면 내 그룹에 표시됩니다.</span><Link href="/dashboard">대시보드로 돌아가기</Link></div>;

  return (
    <form onSubmit={join} className="join-form">
      <label htmlFor="invite-code"><KeyRound size={15} />초대코드{groupId ? " 확인" : ""}</label>
      <input id="invite-code" name="inviteCode" placeholder="PRAY-XXXXXXXX" autoCapitalize="characters" maxLength={13} required />
      {error && <span className="form-error" role="status">{error}</span>}
      <button className={`primary-button ${pending ? "button-pending" : ""}`} type="submit" disabled={pending}>{pending ? <><LoaderCircle className="button-spinner" size={15} />신청 중…</> : groupId ? "이 그룹에 가입 신청" : "가입 신청 보내기"}</button>
    </form>
  );
}
