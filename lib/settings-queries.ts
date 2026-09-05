import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileColor } from "@/lib/domain";
import { normalizeProfileColor } from "./profile-colors";

export type SettingsBundle = {
  userId: string;
  email: string;
  displayName: string | null;
  profileColor: ProfileColor;
  unreadCount: number;
  preferences: {
    in_app_enabled?: boolean;
    new_prayer_enabled?: boolean;
    prayer_response_enabled?: boolean;
    membership_enabled?: boolean;
    push_enabled?: boolean;
    email_enabled?: boolean;
  };
  reminderTimes: Array<{ id: string; time_local: string }>;
};

export async function getSettingsBundle(supabase: SupabaseClient): Promise<SettingsBundle | null> {
  const { data, error } = await supabase.rpc("get_settings_bundle_fast");
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    user_id: string;
    email?: string | null;
    display_name?: string | null;
    profile_color?: string | null;
    unread_count?: number | string;
    preferences?: SettingsBundle["preferences"];
    reminder_times?: SettingsBundle["reminderTimes"];
  };
  return {
    userId: row.user_id,
    email: row.email ?? "",
    displayName: row.display_name ?? null,
    profileColor: normalizeProfileColor(row.profile_color),
    unreadCount: Number(row.unread_count ?? 0),
    preferences: row.preferences ?? {},
    reminderTimes: row.reminder_times ?? [],
  };
}
