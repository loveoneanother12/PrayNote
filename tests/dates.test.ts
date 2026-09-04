import { describe, expect, it } from "vitest";
import { koreaDateKey } from "../lib/dates";

describe("koreaDateKey", () => {
  it("changes date at Korea midnight", () => {
    expect(koreaDateKey(new Date("2026-09-04T14:59:59.000Z"))).toBe("2026-09-04");
    expect(koreaDateKey(new Date("2026-09-04T15:00:00.000Z"))).toBe("2026-09-05");
  });
});
