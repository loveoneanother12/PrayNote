import { redirect } from "next/navigation";
import { PrayNoteApp } from "@/components/praynote-app";
import { formatKoreaToday, getKoreaGreeting } from "@/lib/dates";
import { getDashboardBundle } from "@/lib/dashboard-queries";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{ created?: string; left?: string; deleted?: string; error?: string; compose?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const [bundle, params] = await Promise.all([
    getDashboardBundle(supabase),
    searchParams,
  ]);
  if (!bundle) redirect("/login");

  const fallbackName = bundle.email.split("@")[0] || "기도하는 이";

  return (
    <PrayNoteApp
      displayName={bundle.displayName ?? fallbackName}
      profileColor={bundle.profileColor}
      email={bundle.email}
      groups={bundle.groups}
      prayers={[...bundle.personalPrayers, ...bundle.groupPrayers]}
      notifications={bundle.notifications}
      userId={bundle.userId}
      todayLabel={formatKoreaToday()}
      greeting={getKoreaGreeting()}
      unreadNotificationCount={bundle.unreadCount}
      groupCount={bundle.groupCount}
      prayerCount={bundle.prayerCount}
      personalPrayerCount={bundle.personalPrayerCount}
      created={params.created ?? (params.left ? "left" : params.deleted ? "deleted" : undefined)}
      error={params.error}
      initialComposerOpen={params.compose === "1"}
    />
  );
}
