import { redirect } from "next/navigation";
import { PrayNoteApp } from "@/components/praynote-app";
import { formatKoreaToday } from "@/lib/dates";
import type { GroupSummary } from "@/lib/domain";
import { getNotificationSummaries } from "@/lib/notification-queries";
import { getPrayerSummaries } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{ created?: string; left?: string; deleted?: string; error?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: memberships }, { count: unreadCount }, params] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userData.user.id).single(),
    supabase.from("group_memberships").select("group_id, role").eq("user_id", userData.user.id).eq("status", "active"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userData.user.id).is("read_at", null),
    searchParams,
  ]);

  const membershipRows = memberships ?? [];
  const groupIds = membershipRows.map((membership) => membership.group_id);
  let groups: GroupSummary[] = [];

  if (groupIds.length > 0) {
    const [{ data: groupRows }, { data: memberRows }] = await Promise.all([
      supabase.from("groups").select("id, name, description").in("id", groupIds).is("deleted_at", null),
      supabase.from("group_memberships").select("group_id").in("group_id", groupIds).eq("status", "active"),
    ]);

    groups = (groupRows ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      role: membershipRows.find((membership) => membership.group_id === group.id)?.role ?? "member",
      memberCount: (memberRows ?? []).filter((membership) => membership.group_id === group.id).length,
      unreadCount: 0,
    }));
  }

  const [prayers, notifications] = await Promise.all([
    getPrayerSummaries(supabase, userData.user.id, { groupIds, status: "active" }),
    getNotificationSummaries(supabase, userData.user.id, 4),
  ]);

  const fallbackName = userData.user.email?.split("@")[0] ?? "기도하는 이";

  return (
    <PrayNoteApp
      displayName={profile?.display_name ?? fallbackName}
      email={userData.user.email ?? ""}
      groups={groups}
      prayers={prayers}
      notifications={notifications}
      userId={userData.user.id}
      todayLabel={formatKoreaToday()}
      unreadNotificationCount={unreadCount ?? 0}
      created={params.created ?? (params.left ? "left" : params.deleted ? "deleted" : undefined)}
      error={params.error}
    />
  );
}
