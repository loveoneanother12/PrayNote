import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrayerStatus, PrayerSummary } from "@/lib/domain";

type PrayerFilters = {
  groupIds?: string[];
  prayerIds?: string[];
  authorId?: string;
  status?: PrayerStatus;
  search?: string;
  limit?: number;
  personalOnly?: boolean;
  expandGroups?: boolean;
  memberGroupsOnly?: boolean;
};

type PrayerSummaryRow = {
  id: string;
  group_id: string | null;
  group_name: string;
  group_ids: string[] | null;
  group_names: string[] | null;
  is_personal: boolean;
  author_id: string;
  author_name: string;
  content: string;
  status: PrayerStatus;
  response_count: number;
  has_prayed: boolean;
  created_at: string;
  completed_at: string | null;
};

export async function getPrayerSummaries(
  supabase: SupabaseClient,
  _currentUserId: string,
  filters: PrayerFilters = {},
): Promise<PrayerSummary[]> {
  if (filters.groupIds && filters.groupIds.length === 0) return [];
  if (filters.prayerIds && filters.prayerIds.length === 0) return [];

  const { data, error } = await supabase.rpc("get_prayer_summaries_fast", {
    target_group_ids: filters.groupIds ?? null,
    target_prayer_ids: filters.prayerIds ?? null,
    target_author_id: filters.authorId ?? null,
    target_status: filters.status ?? null,
    target_search: filters.search ?? null,
    result_limit: filters.limit ?? null,
    target_personal_only: filters.personalOnly ?? false,
    expand_groups: filters.expandGroups ?? false,
    member_groups_only: filters.memberGroupsOnly ?? false,
  });

  if (error) throw error;

  return ((data ?? []) as PrayerSummaryRow[]).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name,
    groupIds: row.group_ids ?? [],
    groupNames: row.group_names ?? [],
    isPersonal: row.is_personal,
    authorId: row.author_id,
    authorName: row.author_name,
    content: row.content,
    status: row.status,
    responseCount: Number(row.response_count),
    hasPrayed: row.has_prayed,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }));
}
