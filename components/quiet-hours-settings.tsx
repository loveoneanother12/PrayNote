"use client";

import { LoaderCircle, MoonStar } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function QuietHoursSettings({ userId, initialEnabled, initialStart, initialEnd }: { userId: string; initialEnabled: boolean; initialStart: string; initialEnd: string }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [start, setStart] = useState(initialStart.slice(0, 5));
  const [end, setEnd] = useState(initialEnd.slice(0, 5));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (pending) return;
    if (enabled && start === end) return setMessage("시작 시간과 종료 시간을 다르게 설정해주세요.");
    setPending(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("notification_preferences").update({
      quiet_hours_enabled: enabled,
      quiet_start: `${start}:00`,
      quiet_end: `${end}:00`,
    }).eq("user_id", userId);
    setMessage(error ? "방해금지 시간을 저장하지 못했어요." : enabled ? "방해금지 시간을 저장했어요." : "방해금지를 껐어요.");
    setPending(false);
  }

  return <div className="quiet-hours-setting">
    <label className="setting-toggle quiet-hours-toggle">
      <span className="setting-category-icon quiet"><MoonStar size={17} /></span>
      <span className="setting-copy"><strong>방해금지 시간</strong><small>브라우저 푸시를 잠시 멈추고, 종료 후 발생한 알림 수만 한 번 알려드려요.</small></span>
      <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
    {enabled && <div className="quiet-hours-controls">
      <label><span>시작</span><input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <span aria-hidden="true">–</span>
      <label><span>종료</span><input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <button type="button" onClick={save} disabled={pending}>{pending ? <><LoaderCircle className="button-spinner" size={14} />저장 중…</> : "저장"}</button>
    </div>}
    {!enabled && <button className="quiet-hours-save-off" type="button" onClick={save} disabled={pending}>{pending ? "저장 중…" : "방해금지 OFF 저장"}</button>}
    {message && <p className="quiet-hours-message" role="status">{message}</p>}
  </div>;
}
