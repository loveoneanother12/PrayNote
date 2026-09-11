import { GroupChallenges } from "@/components/group-challenges";
import { getGroupChallengesBundle } from "@/lib/challenge-queries";
import type { GroupRole } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export async function GroupChallengesSection({
  groupId,
  groupName,
  role,
  memberCount,
}: {
  groupId: string;
  groupName: string;
  role: GroupRole;
  memberCount: number;
}) {
  const supabase = await createClient();
  const challenges = await getGroupChallengesBundle(supabase, groupId);
  return <GroupChallenges groupId={groupId} groupName={groupName} role={role} memberCount={memberCount} initialBundle={challenges} />;
}
