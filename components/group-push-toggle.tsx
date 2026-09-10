"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GroupPushToggle({ groupId, userId, initialMuted }: { groupId: string; userId: string; initialMuted: boolean }) {
  const [muted, setMuted] = useState(initialMuted);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    if (pending) return;
    const nextMuted = !muted;
    setPending(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("group_push_preferences").upsert({
      user_id: userId,
      group_id: groupId,
      push_muted: nextMuted,
    }, { onConflict: "user_id,group_id" });
    if (error) {
      setMessage("알림 설정을 바꾸지 못했어요.");
    } else {
      setMuted(nextMuted);
      setMessage(nextMuted ? "이 그룹의 푸시 알림을 껐어요." : "이 그룹의 푸시 알림을 켰어요.");
    }
    setPending(false);
  }

  return <div className="group-push-control">
    <button type="button" className={muted ? "muted" : ""} onClick={toggle} disabled={pending} aria-pressed={muted} aria-label={muted ? "이 그룹 알림 켜기" : "이 그룹 알림 끄기"}>
      {pending ? <LoaderCircle className="button-spinner" size={15} /> : muted ? <BellOff size={16} /> : <Bell size={16} />}
      <span>{muted ? "알림 꺼짐" : "알림 켜짐"}</span>
    </button>
    {message && <small role="status">{message}</small>}
  </div>;
}
