export type GroupRole = "member" | "admin" | "leader";
export type MembershipStatus = "pending" | "active" | "rejected";
export type PrayerStatus = "active" | "completed";
export type NotificationType =
  | "new_prayer"
  | "prayer_response"
  | "membership_requested"
  | "membership_approved"
  | "membership_rejected"
  | "role_changed"
  | "group_updated";

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  role: GroupRole;
  memberCount: number;
  unreadCount: number;
};

export type PrayerSummary = {
  id: string;
  groupId: string | null;
  groupName: string;
  groupIds: string[];
  groupNames: string[];
  isPersonal: boolean;
  authorId: string;
  authorName: string;
  content: string;
  status: PrayerStatus;
  responseCount: number;
  hasPrayed: boolean;
  createdAt: string;
  completedAt: string | null;
};

export type NotificationSummary = {
  id: string;
  type: NotificationType;
  message: string;
  groupName: string | null;
  href: string;
  createdAt: string;
  readAt: string | null;
};
