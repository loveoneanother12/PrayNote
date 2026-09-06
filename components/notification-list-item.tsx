"use client";

import Link from "next/link";
import {
  BellRing,
  BookHeart,
  CheckCircle2,
  Heart,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatKoreaDateTime } from "@/lib/dates";
import type { NotificationSummary, NotificationType } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === "new_prayer") return <BookHeart size={18} />;
  if (type === "prayer_response") return <Heart size={18} />;
  if (type === "membership_requested") return <UserPlus size={18} />;
  if (type === "membership_approved") return <CheckCircle2 size={18} />;
  if (type === "role_changed") return <ShieldCheck size={18} />;
  if (type === "group_updated") return <Users size={18} />;
  return <BellRing size={18} />;
}

export function NotificationListItem({ notification, compact = false, onRead }: { notification: NotificationSummary; compact?: boolean; onRead?: (id: string) => void }) {
  const [read, setRead] = useState(Boolean(notification.readAt));

  useEffect(() => {
    const markRead = () => setRead(true);
    window.addEventListener("praynote:notifications-read-all", markRead);
    return () => window.removeEventListener("praynote:notifications-read-all", markRead);
  }, []);

  function openNotification() {
    if (read) return;
    setRead(true);
    onRead?.(notification.id);
    const supabase = createClient();
    void supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id)
      .then(({ error }) => {
        if (error) setRead(false);
      });
  }

  return (
    <div className={`notification-row-form ${compact ? "compact" : ""}`}>
      <Link href={notification.href} onClick={openNotification} className={`notification-row ${read ? "read" : "unread"}`}>
        <span className={`notification-type-icon type-${notification.type}`}><NotificationIcon type={notification.type} /></span>
        <span className="notification-row-copy">
          <strong>{notification.message}</strong>
          <small>{formatKoreaDateTime(notification.createdAt)}</small>
        </span>
        {!read && <span className="notification-unread-dot" aria-label="읽지 않음" />}
      </Link>
    </div>
  );
}
