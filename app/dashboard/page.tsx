import { redirect } from "next/navigation";
import { PrayNoteApp } from "@/components/praynote-app";
import { formatKoreaToday } from "@/lib/dates";
import { getAuthIdentity } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-queries";
import { getNotificationSummaries } from "@/lib/notification-queries";
import { getPrayerSummaries } from "@/lib/prayer-queries";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{ created?: string; left?: string; deleted?: string; error?: string; compose?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);

  if (!user) {
    redirect("/login");
  }

  const [overview, groupPrayers, personalPrayers, notifications, params] = await Promise.all([
    getDashboardOverview(supabase),
    getPrayerSummaries(supabase, user.id, { status: "active", expandGroups: true, memberGroupsOnly: true }),
    getPrayerSummaries(supabase, user.id, { authorId: user.id, status: "active", personalOnly: true }),
    getNotificationSummaries(supabase, user.id, 4),
    searchParams,
  ]);

  const fallbackName = user.email?.split("@")[0] ?? "기도하는 이";

  return (
    <PrayNoteApp
      displayName={overview.displayName ?? fallbackName}
      email={user.email ?? ""}
      groups={overview.groups}
      prayers={[...personalPrayers, ...groupPrayers]}
      notifications={notifications}
      userId={user.id}
      todayLabel={formatKoreaToday()}
      unreadNotificationCount={overview.unreadCount}
      created={params.created ?? (params.left ? "left" : params.deleted ? "deleted" : undefined)}
      error={params.error}
      initialComposerOpen={params.compose === "1"}
    />
  );
}
