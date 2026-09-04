import { describe, expect, it } from "vitest";
import { safeInternalPath } from "../lib/navigation";

describe("safeInternalPath", () => {
  it("keeps same-origin relative destinations", () => {
    expect(safeInternalPath("/groups/abc?view=all")).toBe("/groups/abc?view=all");
  });

  it("blocks external and protocol-relative redirects", () => {
    expect(safeInternalPath("https://example.com")).toBe("/dashboard");
    expect(safeInternalPath("//example.com", "/login")).toBe("/login");
  });
});
