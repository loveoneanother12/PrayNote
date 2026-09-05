"use client";

import { Check, Heart, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { PrayerStatus } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

type InstantPrayerButtonProps = {
  prayerId: string;
  initialHasPrayed: boolean;
  initialResponseCount: number;
  className: string;
  countPrefix?: string;
  iconSize?: number;
};

export function InstantPrayerButton({
  prayerId,
  initialHasPrayed,
  initialResponseCount,
  className,
  countPrefix = "",
  iconSize = 16,
}: InstantPrayerButtonProps) {
  const router = useRouter();
  const [hasPrayed, setHasPrayed] = useState(initialHasPrayed);
  const [responseCount, setResponseCount] = useState(initialResponseCount);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    if (pending) return;
    const previous = hasPrayed;
    const next = !previous;
    setFailed(false);
    setPending(true);
    setHasPrayed(next);
    setResponseCount((count) => Math.max(0, count + (next ? 1 : -1)));

    const supabase = createClient();
    const { data, error } = await supabase.rpc("toggle_prayer_response", { target_prayer_id: prayerId });
    if (error) {
      setHasPrayed(previous);
      setResponseCount((count) => Math.max(0, count + (next ? -1 : 1)));
      setFailed(true);
    } else if (typeof data === "boolean" && data !== next) {
      setHasPrayed(data);
      setResponseCount((count) => Math.max(0, count + (data ? 1 : -1)));
    }
    setPending(false);
    if (!error) startTransition(() => router.refresh());
  }

  return (
    <>
      <button
        className={`${className} ${hasPrayed ? "selected done" : ""} ${pending ? "button-pending" : ""}`.trim()}
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={hasPrayed}
        aria-busy={pending}
        title={failed ? "저장하지 못했어요. 다시 시도해주세요." : hasPrayed ? "다시 누르면 오늘 기록이 취소됩니다." : "한국시간 기준 오늘의 기도 기록을 남깁니다."}
      >
        {pending ? <LoaderCircle className="button-spinner" size={iconSize} /> : hasPrayed ? <Check size={iconSize} /> : <Heart size={iconSize} />}
        {hasPrayed ? "오늘 기도완료" : "오늘 기도하기"}
        <span>{countPrefix}{responseCount}회</span>
      </button>
      {failed && <span className="sr-only" role="status">기도 기록을 저장하지 못했어요.</span>}
    </>
  );
}

type InstantPrayerStatusButtonProps = {
  prayerId: string;
  initialStatus: PrayerStatus;
  initialCompletedAt?: string | null;
  status?: PrayerStatus;
  className: string;
  onStatusChange?: (status: PrayerStatus, completedAt: string | null) => void;
};

export function InstantPrayerStatusButton({ prayerId, initialStatus, initialCompletedAt = null, status: controlledStatus, className, onStatusChange }: InstantPrayerStatusButtonProps) {
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const status = controlledStatus ?? localStatus;
  const completed = status === "completed";

  function applyStatus(nextStatus: PrayerStatus, completedAt: string | null) {
    setLocalStatus(nextStatus);
    onStatusChange?.(nextStatus, completedAt);
  }

  async function toggle() {
    if (pending) return;
    const previous = status;
    const nextStatus: PrayerStatus = completed ? "active" : "completed";
    const completedAt = nextStatus === "completed" ? new Date().toISOString() : null;
    setFailed(false);
    setPending(true);
    applyStatus(nextStatus, completedAt);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("prayer_requests")
      .update({ status: nextStatus, completed_at: completedAt })
      .eq("id", prayerId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      applyStatus(previous, previous === "completed" ? initialCompletedAt : null);
      setFailed(true);
    }
    setPending(false);
    if (!error && data) startTransition(() => router.refresh());
  }

  return (
    <>
      <button
        className={`${className} ${pending ? "button-pending" : ""}`.trim()}
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-busy={pending}
        title={failed ? "상태를 저장하지 못했어요. 다시 시도해주세요." : undefined}
      >
        {pending ? <LoaderCircle className="button-spinner" size={15} /> : completed ? <RotateCcw size={15} /> : <Check size={15} />}
        {completed ? "진행 중으로 되돌리기" : "해결 완료"}
      </button>
      {failed && <span className="sr-only" role="status">기도 상태를 저장하지 못했어요.</span>}
    </>
  );
}
