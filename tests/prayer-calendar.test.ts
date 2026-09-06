import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const calendar = readFileSync(join(root, "components/prayer-calendar.tsx"), "utf8");
const prayersPage = readFileSync(join(root, "app/prayers/page.tsx"), "utf8");

describe("prayer history calendar", () => {
  it("groups prayers by their Korea-time upload date", () => {
    expect(calendar).toContain("koreaDateKey(new Date(prayer.createdAt))");
    expect(prayersPage).toContain("<PrayerCalendar prayers={prayers}");
  });

  it("shows at most three dots while keeping every selected-day prayer in the list", () => {
    expect(calendar).toContain("datePrayers.slice(0, 3)");
    expect(calendar).toContain("selectedPrayers.map((prayer)");
    expect(calendar).toContain('prayer.status === "completed"');
  });
});
