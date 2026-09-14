"use client";

import { Ban, Flag, LoaderCircle, MoreHorizontal, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const reasons = [
  ["spam", "스팸·광고"],
  ["harassment", "비방·명예훼손"],
  ["inappropriate", "부적절한 내용"],
  ["personal_info", "개인정보 노출"],
  ["other", "기타"],
] as const;

export function PrayerSafetyMenu({ prayerId, authorId, authorName, onHidden }: { prayerId: string; authorId: string; authorName: string; onHidden?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");

  async function report() {
    if (reporting) return;
    setReporting(true); setError("");
    const { error: mutationError } = await createClient().rpc("report_prayer", { target_prayer_id: prayerId, report_reason: reason, report_details: details.trim() || null });
    if (mutationError) { setError(mutationError.message.includes("duplicate") ? "이미 신고한 기도제목입니다." : "신고를 접수하지 못했어요."); setReporting(false); return; }
    onHidden?.(); setReporting(false); setReportOpen(false); setOpen(false); router.refresh();
  }

  async function block() {
    if (blocking || !confirm(`${authorName}님을 차단할까요? 이 사용자의 기도제목과 알림이 보이지 않게 됩니다.`)) return;
    setBlocking(true); setError("");
    const { error: mutationError } = await createClient().rpc("block_user", { target_user_id: authorId });
    if (mutationError) { setError(mutationError.message.includes("super_admin") ? "운영자 계정은 차단할 수 없습니다." : "사용자를 차단하지 못했어요."); setBlocking(false); return; }
    onHidden?.(); setBlocking(false); setOpen(false); router.refresh();
  }

  return <div className="prayer-safety-wrap">
    <button type="button" className="prayer-safety-trigger" aria-label="신고 및 차단" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal size={18} /></button>
    {open && <div className="prayer-safety-popover">
      <button type="button" onClick={() => { setOpen(false); setReportOpen(true); }}><Flag size={15} />신고하기</button>
      <button type="button" onClick={block} disabled={blocking}>{blocking ? <LoaderCircle className="button-spinner" size={15} /> : <Ban size={15} />}이 사용자 차단</button>
      {error && <small role="alert">{error}</small>}
    </div>}
    {reportOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => !reporting && setReportOpen(false)}>
      <div className="composer-modal report-modal" role="dialog" aria-modal="true" aria-labelledby={`report-${prayerId}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="composer-heading"><div><span className="overview-icon"><ShieldAlert size={20} /></span><div><h2 id={`report-${prayerId}`}>기도제목 신고</h2><p>신고 후 이 기도제목은 내 화면에서 즉시 숨겨집니다.</p></div></div><button type="button" onClick={() => setReportOpen(false)} disabled={reporting} aria-label="닫기">×</button></div>
        <fieldset className="report-reasons"><legend>신고 사유</legend>{reasons.map(([value, label]) => <label key={value}><input type="radio" name={`reason-${prayerId}`} checked={reason === value} onChange={() => setReason(value)} /><span>{label}</span></label>)}</fieldset>
        <label className="report-details">추가 설명 <span>선택</span><textarea maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="검토에 도움이 될 내용을 적어주세요." /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="report-actions"><button className="cancel-button" type="button" onClick={() => setReportOpen(false)} disabled={reporting}>취소</button><button className="danger-button" type="button" onClick={report} disabled={reporting}>{reporting ? <><LoaderCircle className="button-spinner" size={15} />접수 중…</> : <><Flag size={15} />신고 접수</>}</button></div>
      </div>
    </div>}
  </div>;
}
