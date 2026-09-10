import { describe, expect, it } from "vitest";
import { quietHoursReleaseAt } from "../lib/push-quiet-hours";

describe("Korea-time push quiet hours", () => {
  it("defers an overnight quiet-hour event until the same Korea morning", () => {
    const release = quietHoursReleaseAt(
      { quiet_hours_enabled: true, quiet_start: "22:00", quiet_end: "07:00" },
      new Date("2026-09-09T20:30:00.000Z"),
    );
    expect(release?.toISOString()).toBe("2026-09-09T22:00:00.000Z");
  });

  it("defers a late-night event until the next Korea morning", () => {
    const release = quietHoursReleaseAt(
      { quiet_hours_enabled: true, quiet_start: "22:00", quiet_end: "07:00" },
      new Date("2026-09-09T14:30:00.000Z"),
    );
    expect(release?.toISOString()).toBe("2026-09-09T22:00:00.000Z");
  });

  it("does not defer outside the configured interval", () => {
    expect(quietHoursReleaseAt(
      { quiet_hours_enabled: true, quiet_start: "22:00", quiet_end: "07:00" },
      new Date("2026-09-09T03:00:00.000Z"),
    )).toBeNull();
  });

  it("supports a same-day quiet interval", () => {
    const release = quietHoursReleaseAt(
      { quiet_hours_enabled: true, quiet_start: "13:00", quiet_end: "15:00" },
      new Date("2026-09-09T05:00:00.000Z"),
    );
    expect(release?.toISOString()).toBe("2026-09-09T06:00:00.000Z");
  });
});
