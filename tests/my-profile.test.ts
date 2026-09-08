import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("My profile and prayer streak", () => {
  const page = read("app/prayers/page.tsx");
  const card = read("components/my-profile-card.tsx");
  const settings = read("app/settings/page.tsx");
  const migration = read("supabase/migrations/202609080001_my_profile_prayer_streak.sql");

  it("moves profile editing from settings into the My profile dialog", () => {
    expect(page).toContain("<MyProfileCard");
    expect(card).toContain('aria-labelledby="profile-edit-title"');
    expect(card).toContain("<InstantProfileForm");
    expect(card).toContain("<GoogleIdentitySettings");
    expect(settings).not.toContain("<InstantProfileForm");
    expect(settings).not.toContain("<GoogleIdentitySettings");
  });

  it("counts distinct Korea-time response days and resets after a missed day", () => {
    expect(migration).toContain("select distinct response.prayed_on");
    expect(migration).toContain("response.user_id = auth.uid()");
    expect(migration).toContain("Asia/Seoul");
    expect(migration).toContain("today.day - 1");
    expect(migration).toContain("else null");
    expect(migration).toContain("current_streak");
  });

  it("shows compact counts and a motivational progress bar without sharing yet", () => {
    expect(card).toContain("my-prayer-mini-stats");
    expect(card).toContain('role="progressbar"');
    expect(card).toContain("일째 기도 중이에요!");
    expect(card).not.toContain("인스타그램");
    expect(card).not.toContain("카톡");
  });
});
