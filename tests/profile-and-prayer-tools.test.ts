import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeProfileColor, PROFILE_COLORS } from "../lib/profile-colors";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("prayer owner tools", () => {
  it("shows edit and multi-group share tools only for the author", () => {
    const card = read("components/prayer-record-card.tsx");
    const actions = read("components/prayer-owner-actions.tsx");
    expect(card).toContain("{mine && <PrayerOwnerActions");
    expect(actions).toContain("기도제목 수정");
    expect(actions).toContain("다른 그룹에도 공유하기");
    expect(actions).toContain("sharedGroups={sharedGroups}");
  });

  it("uses the owner modal instead of an inline edit form on details", () => {
    const detail = read("app/prayers/[prayerId]/page.tsx");
    expect(detail).toContain("<PrayerDetailContent");
    expect(detail).not.toContain("updatePrayer");
  });
});

describe("profile colors", () => {
  it("offers eight safe colors and falls back to indigo", () => {
    expect(PROFILE_COLORS).toHaveLength(8);
    expect(normalizeProfileColor("teal")).toBe("teal");
    expect(normalizeProfileColor("not-allowed")).toBe("indigo");
  });
});
