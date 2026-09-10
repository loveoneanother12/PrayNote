export type ChallengeKind = "prayer_relay" | "first_prayer" | "unbroken_prayer";
export type ChallengeStatus = "scheduled" | "active" | "completed" | "stopped";
export type ChallengeInviteMode = "open" | "invite_all";

export const CHALLENGE_KINDS: Record<ChallengeKind, {
  label: string;
  shortLabel: string;
  description: string;
  conditions: string[];
}> = {
  prayer_relay: {
    label: "기도 릴레이",
    shortLabel: "매일 함께",
    description: "매일 한 명 이상 기도를 이어가고, 참여자 모두가 기간 중 한 번 이상 함께해요.",
    conditions: ["매일 최소 한 명 이상 기도하기", "참여자 모두 기간 중 한 번 이상 기도하기"],
  },
  first_prayer: {
    label: "모두의 첫 기도",
    shortLabel: "모두 함께",
    description: "기간 안에 참여한 모든 사람이 한 번 이상 기도하며 서로의 첫걸음을 응원해요.",
    conditions: ["참여자 모두 한 번 이상 기도하기"],
  },
  unbroken_prayer: {
    label: "끊기지 않는 기도",
    shortLabel: "하루도 빠짐없이",
    description: "정해진 기간 동안 그룹의 기도가 하루도 비지 않도록 함께 이어가요.",
    conditions: ["기간 동안 기도가 비는 날 없이 이어가기"],
  },
};

export type ChallengePreview = {
  id: string;
  kind: ChallengeKind;
  title: string;
  startDate: string;
  endDate: string;
  inviteMode: ChallengeInviteMode;
  status: ChallengeStatus;
  joined: boolean;
  activeDays: string[];
  personallyParticipated: boolean;
  completedSuccessfully: boolean | null;
};

export type ChallengeParticipant = {
  id: string;
  userId: string | null;
  displayName: string;
  profileColor: string;
  joinedAt: string;
  leftAt: string | null;
  hasParticipated: boolean;
};

export type PrayerChallenge = {
  id: string;
  groupId: string;
  kind: ChallengeKind;
  title: string;
  startDate: string;
  endDate: string;
  inviteMode: ChallengeInviteMode;
  status: ChallengeStatus;
  completedSuccessfully: boolean | null;
  result: {
    activeDayCount?: number;
    participantCount?: number;
    allParticipated?: boolean;
    longestStreak?: number;
  } | null;
  joined: boolean;
  activeDays: string[];
};
