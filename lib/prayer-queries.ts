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
};

export async function getPrayerSummaries(
  supabase: SupabaseClient,
  currentUserId: string,
  filters: PrayerFilters = {},
): Promise<PrayerSummary[]> {
  if (filters.groupIds && filters.groupIds.length === 0) return [];
  if (filters.prayerIds && filters.prayerIds.length === 0) return [];

  let query = supabase
    .from("prayer_requests")
    .select("id, group_id, author_id, content, status, created_at, completed_at")
    .is("deleted_at", null)
    .is("hidden_at", null)
    .order("created_at", { ascending: false });

  if (filters.groupIds) query = query.in("group_id", filters.groupIds);
  if (filters.prayerIds) query = query.in("id", filters.prayerIds);
  if (filters.authorId) query = query.eq("author_id", filters.authorId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("content", `%${filters.search}%`);
  if (filters.limit) query = query.limit(filters.limit);

  const { data: prayers, error } = await query;
  if (error) throw error;
  if (!prayers?.length) return [];

  const prayerIds = prayers.map((prayer) => prayer.id);
  const authorIds = [...new Set(prayers.map((prayer) => prayer.author_id))];
  const groupIds = [...new Set(prayers.map((prayer) => prayer.group_id))];

  const [{ data: profiles }, { data: groups }, { data: responses }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", authorIds),
    supabase.from("groups").select("id, name").in("id", groupIds),
    supabase.from("prayer_responses").select("prayer_id, user_id, prayed_on").in("prayer_id", prayerIds),
  ]);

  const today = koreaDateKey();

  return prayers.map((prayer) => {
    const prayerResponses = responses?.filter((response) => response.prayer_id === prayer.id) ?? [];
    return {
      id: prayer.id,
      groupId: prayer.group_id,
      groupName: groups?.find((group) => group.id === prayer.group_id)?.name ?? "그룹",
      authorId: prayer.author_id,
      authorName: profiles?.find((profile) => profile.id === prayer.author_id)?.display_name ?? "멤버",
      content: prayer.content,
      status: prayer.status,
      responseCount: prayerResponses.length,
      hasPrayed: prayerResponses.some(
        (response) => response.user_id === currentUserId && response.prayed_on === today,
      ),
      createdAt: prayer.created_at,
      completedAt: prayer.completed_at,
    };
  });
}
