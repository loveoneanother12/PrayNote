import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrayerStatus, PrayerSummary } from "@/lib/domain";
import { koreaDateKey } from "@/lib/dates";

type PrayerFilters = {
  groupIds?: string[];
  prayerIds?: string[];
  authorId?: string;
  status?: PrayerStatus;
  search?: string;
  limit?: number;
  personalOnly?: boolean;
  expandGroups?: boolean;
};

type ShareRow = { prayer_id: string; group_id: string };

export async function getPrayerSummaries(
  supabase: SupabaseClient,
  currentUserId: string,
  filters: PrayerFilters = {},
): Promise<PrayerSummary[]> {
  if (filters.groupIds && filters.groupIds.length === 0) return [];
  if (filters.prayerIds && filters.prayerIds.length === 0) return [];

  let matchingShares: ShareRow[] | null = null;
  if (filters.groupIds) {
    let shareQuery = supabase.from("prayer_group_shares").select("prayer_id, group_id").in("group_id", filters.groupIds);
    if (filters.prayerIds) shareQuery = shareQuery.in("prayer_id", filters.prayerIds);
    const { data, error } = await shareQuery;
    if (error) throw error;
    matchingShares = (data ?? []) as ShareRow[];
    if (matchingShares.length === 0) return [];
  }

  let query = supabase
    .from("prayer_requests")
    .select("id, group_id, author_id, content, status, created_at, completed_at")
    .is("deleted_at", null)
    .is("hidden_at", null)
    .order("created_at", { ascending: false });

  if (matchingShares) query = query.in("id", [...new Set(matchingShares.map((share) => share.prayer_id))]);
  else if (filters.prayerIds) query = query.in("id", filters.prayerIds);
  if (filters.authorId) query = query.eq("author_id", filters.authorId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("content", `%${filters.search}%`);
  if (filters.personalOnly) query = query.is("group_id", null);
  if (filters.limit) query = query.limit(filters.limit);

  const { data: prayers, error } = await query;
  if (error) throw error;
  if (!prayers?.length) return [];

  const prayerIds = prayers.map((prayer) => prayer.id);
  const authorIds = [...new Set(prayers.map((prayer) => prayer.author_id))];
  const { data: allShareData, error: sharesError } = await supabase
    .from("prayer_group_shares")
    .select("prayer_id, group_id")
    .in("prayer_id", prayerIds);
  if (sharesError) throw sharesError;
  const allShares = (allShareData ?? []) as ShareRow[];
  const visibleShares = matchingShares ?? allShares;
  const groupIds = [...new Set(allShares.map((share) => share.group_id))];

  const [{ data: profiles }, groupsResult, { data: responses }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", authorIds),
    groupIds.length
      ? supabase.from("groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("prayer_responses").select("prayer_id, user_id, prayed_on").in("prayer_id", prayerIds),
  ]);
  const groups = groupsResult.data ?? [];
  const today = koreaDateKey();

  return prayers.flatMap((prayer) => {
    const prayerResponses = responses?.filter((response) => response.prayer_id === prayer.id) ?? [];
    const prayerShares = allShares.filter((share) => share.prayer_id === prayer.id);
    const relevantShares = visibleShares.filter((share) => share.prayer_id === prayer.id);
    const sharedGroupIds = prayerShares.map((share) => share.group_id);
    const sharedGroupNames = sharedGroupIds.map((groupId) => groups.find((group) => group.id === groupId)?.name ?? "그룹");
    const base = {
      id: prayer.id,
      groupIds: sharedGroupIds,
      groupNames: sharedGroupNames,
      isPersonal: prayerShares.length === 0,
      authorId: prayer.author_id,
      authorName: profiles?.find((profile) => profile.id === prayer.author_id)?.display_name ?? "멤버",
      content: prayer.content,
      status: prayer.status as PrayerStatus,
      responseCount: prayerResponses.length,
      hasPrayed: prayerResponses.some((response) => response.user_id === currentUserId && response.prayed_on === today),
      createdAt: prayer.created_at,
      completedAt: prayer.completed_at,
    };

    if (filters.expandGroups && relevantShares.length > 0) {
      return relevantShares.map((share) => ({
        ...base,
        groupId: share.group_id,
        groupName: groups.find((group) => group.id === share.group_id)?.name ?? "그룹",
      }));
    }

    const primaryShare = relevantShares[0] ?? prayerShares[0];
    return [{
      ...base,
      groupId: primaryShare?.group_id ?? null,
      groupName: sharedGroupNames.length === 0
        ? "개인기도"
        : sharedGroupNames.length === 1
          ? sharedGroupNames[0]
          : `${sharedGroupNames[0]} 외 ${sharedGroupNames.length - 1}개 그룹`,
    }];
  });
}
