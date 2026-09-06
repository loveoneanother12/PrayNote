"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NotificationRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => {
          router.refresh();
          setVisible(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setVisible(false), 3500);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  if (!visible) return null;
  return <div className="toast realtime-toast" role="status"><Bell size={16} />새 알림이 도착했어요.</div>;
}
