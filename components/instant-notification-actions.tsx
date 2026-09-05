"use client";

import { CheckCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function InstantMarkAllNotificationsRead() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function markAllRead() {
    if (pending || done) return;
    setPending(true);
    setDone(true);
    window.dispatchEvent(new Event("praynote:notifications-read-all"));

    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);

    if (error) setDone(false);
    setPending(false);
    if (!error) startTransition(() => router.refresh());
  }

  return (
    <button className={`mark-all-button ${pending ? "button-pending" : ""}`} type="button" onClick={markAllRead} disabled={pending || done} aria-busy={pending}>
      {pending ? <LoaderCircle className="button-spinner" size={16} /> : <CheckCheck size={16} />}
      {done ? "읽음 완료" : "모두 읽음"}
    </button>
  );
}
