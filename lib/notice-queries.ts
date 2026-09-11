import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileColor } from "@/lib/domain";
import { normalizeProfileColor } from "@/lib/profile-colors";
import { retrySupabaseRead } from "@/lib/supabase/retry-read";

export type NoticeSummary = {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NoticesPageBundle = {
  userId: string;
  email: string;
  displayName: string | null;
  profileColor: ProfileColor;
  unreadCount: number;
  isSuperAdmin: boolean;
  notices: NoticeSummary[];
};

export async function getNoticesPageBundle(supabase: SupabaseClient): Promise<NoticesPageBundle | null> {
  const { data, error } = await retrySupabaseRead(() => supabase.rpc("get_notices_page_bundle_fast"));
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    user_id: string;
    email?: string | null;
    display_name?: string | null;
    profile_color?: string | null;
    unread_count?: number | string;
    is_super_admin?: boolean;
    notices?: Array<{ id: string; title: string; content: string; is_published: boolean; created_at: string; updated_at: string }>;
  };
  return {
    userId: row.user_id,
    email: row.email ?? "",
    displayName: row.display_name ?? null,
    profileColor: normalizeProfileColor(row.profile_color),
    unreadCount: Number(row.unread_count ?? 0),
    isSuperAdmin: row.is_super_admin === true,
    notices: (row.notices ?? []).map((notice) => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      isPublished: notice.is_published,
      createdAt: notice.created_at,
      updatedAt: notice.updated_at,
    })),
  };
}
