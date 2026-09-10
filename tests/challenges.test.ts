import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CHALLENGE_KINDS } from "../lib/challenge-domain";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("group prayer challenges", () => {
  it("launches with the three non-competitive challenge types", () => {
    expect(Object.keys(CHALLENGE_KINDS)).toEqual(["prayer_relay", "first_prayer", "unbroken_prayer"]);
    expect(JSON.stringify(CHALLENGE_KINDS)).not.toContain("순위");
  });

  it("records challenge activity from verified prayer responses", () => {
    const migration = read("supabase/migrations/202609100003_group_prayer_challenges.sql");
    expect(migration).toContain("after insert or delete on public.prayer_responses");
    expect(migration).toContain("response_row.prayed_on between challenge.start_date and challenge.end_date");
    expect(migration).toContain("on conflict (participant_id, activity_date) do nothing");
  });

  it("keeps challenge writes behind role-checked RPCs and RLS", () => {
    const migration = read("supabase/migrations/202609100003_group_prayer_challenges.sql");
    expect(migration).toContain("leader_permission_required");
    expect(migration).toContain("prayer_challenges enable row level security");
    expect(migration).toContain("toggle_challenge_participation");
    expect(migration).not.toContain("grant insert on table public.prayer_challenges");
  });

  it("integrates challenge alerts with preferences and group destinations", () => {
    expect(read("lib/domain.ts")).toContain('"challenge_update"');
    expect(read("lib/push.ts")).toContain('case "challenge_update"');
    expect(read("app/settings/page.tsx")).toContain('name="challengeEnabled"');
  });
});
