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

  it("preserves entered line breaks and shows completion as a checkbox", () => {
    const styles = read("app/globals.css");
    const actions = read("components/instant-prayer-actions.tsx");
    expect(styles).toMatch(/\.dashboard-prayer-link[^}]*white-space: pre-wrap/);
    expect(actions).toContain("resolve-checkbox");
    expect(actions).toContain("aria-pressed={completed}");
    expect(actions).not.toContain("RotateCcw");
  });
});

describe("profile colors", () => {
  it("offers a compact palette of twenty-eight safe colors and falls back to indigo", () => {
    expect(PROFILE_COLORS).toHaveLength(28);
    expect(normalizeProfileColor("teal")).toBe("teal");
    expect(normalizeProfileColor("lavender")).toBe("lavender");
    expect(normalizeProfileColor("not-allowed")).toBe("indigo");
  });
});
