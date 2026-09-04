"use client";

import { BellPlus, Clock3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReminderTime = {
  id: string;
  timeLocal: string;
};

type PrayerReminderSettingsProps = {
  userId: string;
  initialTimes: ReminderTime[];
  pushEnabled: boolean;
};

function displayTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const period = hours < 12 ? "오전" : "오후";
  const hour = hours % 12 || 12;
  return `${period} ${hour}:${minutes.toString().padStart(2, "0")}`;
}

export function PrayerReminderSettings({ userId, initialTimes, pushEnabled }: PrayerReminderSettingsProps) {
  const [times, setTimes] = useState(initialTimes);
  const [adding, setAdding] = useState(false);
  const [newTime, setNewTime] = useState("07:00");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [isPushEnabled, setIsPushEnabled] = useState(pushEnabled);

  useEffect(() => {
    function handlePushStatus(event: Event) {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") setIsPushEnabled(detail.enabled);
    }
    window.addEventListener("praynote:push-status", handlePushStatus);
    return () => window.removeEventListener("praynote:push-status", handlePushStatus);
  }, []);

  async function addReminder() {
    if (times.length >= 5 || !/^\d{2}:\d{2}$/.test(newTime)) return;
    setWorking(true);
    setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("prayer_reminder_times")
      .insert({ user_id: userId, time_local: `${newTime}:00` })
      .select("id, time_local")
      .single();

    if (error || !data) {
      setMessage(error?.code === "23505" ? "이미 등록된 시간입니다." : "시간을 추가하지 못했어요.");
    } else {
      setTimes((current) => [...current, { id: data.id, timeLocal: data.time_local }]
        .sort((a, b) => a.timeLocal.localeCompare(b.timeLocal)));
      setAdding(false);
      setMessage("매일 한국시간 기준으로 알림을 보내드릴게요.");
    }
    setWorking(false);
  }

  async function removeReminder(id: string) {
    setWorking(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("prayer_reminder_times").delete().eq("id", id);
    if (error) {
      setMessage("시간을 삭제하지 못했어요.");
    } else {
      setTimes((current) => current.filter((item) => item.id !== id));
      setMessage("예약 시간을 삭제했어요.");
    }
    setWorking(false);
  }

  return (
    <div className="prayer-reminder-setting">
      <div className="reminder-heading">
        <span className="setting-category-icon reminder"><BellPlus size={17} /></span>
        <div><strong>매일 기도 시간 알림</strong><small>등록한 시각에 “기도할 시간입니다.” 알림을 보내요.</small></div>
        <button className="reminder-add-button" type="button" onClick={() => setAdding(true)} disabled={times.length >= 5 || adding || working} aria-label="기도 시간 추가">
          <Plus size={15} />시간 추가
        </button>
      </div>

      {!isPushEnabled && <p className="reminder-warning">먼저 위에서 이 기기의 브라우저 푸시를 켜주세요.</p>}

      <div className="reminder-times">
        {times.length === 0 && !adding && <div className="reminder-empty"><Clock3 size={16} />아직 정해진 기도 시간이 없어요.</div>}
        {times.map((item) => (
          <div className="reminder-time-row" key={item.id}>
            <span><Clock3 size={15} />{displayTime(item.timeLocal)}</span>
            <button type="button" onClick={() => removeReminder(item.id)} disabled={working} aria-label={`${displayTime(item.timeLocal)} 알림 삭제`}><Trash2 size={14} /></button>
          </div>
        ))}
        {adding && (
          <div className="reminder-time-form">
            <input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} aria-label="새 기도 시간" required />
            <button type="button" onClick={addReminder} disabled={working}>추가</button>
            <button className="cancel" type="button" onClick={() => setAdding(false)} disabled={working}>취소</button>
          </div>
        )}
      </div>
      <div className="reminder-footnote"><span>한국시간 · 매일 반복</span><span>{times.length}/5</span></div>
      {message && <p className="reminder-message" role="status">{message}</p>}
    </div>
  );
}
