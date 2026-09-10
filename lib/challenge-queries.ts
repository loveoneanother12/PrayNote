import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChallengeParticipant, PrayerChallenge } from "@/lib/challenge-domain";

type RawParticipant = {
  id: string;
  user_id: string | null;
  display_name: string;
  profile_color: string;
  joined_at: string;
  left_at: string | null;
  has_participated: boolean;
};

type RawChallenge = {
  id: string;
  group_id: string;
  kind: PrayerChallenge["kind"];
  title: string;
  start_date: string;
  end_date: string;
  invite_mode: PrayerChallenge["inviteMode"];
  status: PrayerChallenge["status"];
  completed_successfully: boolean | null;
  result: PrayerChallenge["result"];
  joined: boolean;
  active_days?: string[];
  participants?: RawParticipant[];
  recent_activity?: Array<{ activity_date: string; first_recorded_at: string; display_name: string }>;
};

export type ChallengeActivity = {
  date: string;
  recordedAt: string;
  displayName: string;
};

export type ChallengeWithDetails = PrayerChallenge & {
  participants: ChallengeParticipant[];
  recentActivity: ChallengeActivity[];
};

export type GroupChallengesBundle = {
  active: ChallengeWithDetails | null;
  history: ChallengeWithDetails[];
};

function mapChallenge(row: RawChallenge): ChallengeWithDetails {
  return {
    id: row.id,
    groupId: row.group_id,
    kind: row.kind,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    inviteMode: row.invite_mode,
    status: row.status,
    completedSuccessfully: row.completed_successfully,
    result: row.result,
    joined: row.joined === true,
    activeDays: row.active_days ?? [],
    participants: (row.participants ?? []).map((participant) => ({
      id: participant.id,
      userId: participant.user_id,
      displayName: participant.display_name,
      profileColor: participant.profile_color,
      joinedAt: participant.joined_at,
      leftAt: participant.left_at,
      hasParticipated: participant.has_participated === true,
    })),
    recentActivity: (row.recent_activity ?? []).map((activity) => ({
      date: activity.activity_date,
      recordedAt: activity.first_recorded_at,
      displayName: activity.display_name,
    })),
  };
}

export function mapGroupChallengesBundleData(data: unknown): GroupChallengesBundle {
  const row = (data ?? {}) as { active?: RawChallenge | null; history?: RawChallenge[] };
  return {
    active: row.active ? mapChallenge(row.active) : null,
    history: (row.history ?? []).map(mapChallenge),
  };
}

export async function getGroupChallengesBundle(supabase: SupabaseClient, groupId: string): Promise<GroupChallengesBundle> {
  const { data, error } = await supabase.rpc("get_group_challenges_bundle", { target_group_id: groupId });
  if (error) {
    // Challenges are supplementary to the group page. Keep the group's core
    // prayers available if challenge synchronization temporarily fails.
    console.error("Failed to load group challenges", error);
    return { active: null, history: [] };
  }
  return mapGroupChallengesBundleData(data);
}
