"use client";

import {
  BellRing,
  BookHeart,
  CheckCircle2,
  Heart,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { markNotificationRead } from "@/app/notification-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { formatKoreaDateTime } from "@/lib/dates";
import type { NotificationSummary, NotificationType } from "@/lib/domain";

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === "new_prayer") return <BookHeart size={18} />;
  if (type === "prayer_response") return <Heart size={18} />;
  if (type === "membership_requested") return <UserPlus size={18} />;
  if (type === "membership_approved") return <CheckCircle2 size={18} />;
  if (type === "role_changed") return <ShieldCheck size={18} />;
  if (type === "group_updated") return <Users size={18} />;
  return <BellRing size={18} />;
}

export function NotificationListItem({ notification, compact = false }: { notification: NotificationSummary; compact?: boolean }) {
  return (
    <form action={markNotificationRead} className={`notification-row-form ${compact ? "compact" : ""}`}>
      <input type="hidden" name="notificationId" value={notification.id} />
      <input type="hidden" name="destination" value={notification.href} />
      <PendingSubmitButton className={`notification-row ${notification.readAt ? "read" : "unread"}`} pendingText="여는 중…">
        <span className={`notification-type-icon type-${notification.type}`}><NotificationIcon type={notification.type} /></span>
        <span className="notification-row-copy">
          <strong>{notification.message}</strong>
          <small>{formatKoreaDateTime(notification.createdAt)}</small>
        </span>
        {!notification.readAt && <span className="notification-unread-dot" aria-label="읽지 않음" />}
      </PendingSubmitButton>
    </form>
  );
}
