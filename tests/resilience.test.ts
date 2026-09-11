import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isRetryableReadError } from "../lib/supabase/retry-read";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("network and partial-failure resilience", () => {
  it("retries transient reads but not permanent database errors", () => {
    expect(isRetryableReadError({ message: "Failed to fetch" })).toBe(true);
    expect(isRetryableReadError({ code: "PGRST001", message: "gateway unavailable" })).toBe(true);
    expect(isRetryableReadError({ code: "42501", message: "permission denied" })).toBe(false);
  });

  it("retries transient auth validation without treating it as a logout", () => {
    const proxy = read("proxy.ts");
    expect(proxy.match(/supabase\.auth\.getClaims\(\)/g)).toHaveLength(2);
    expect(proxy).toContain("hasAuthCookie && transientAuthFailure");
  });

  it("verifies settings updates returned the current user row", () => {
    const forms = read("components/instant-settings-forms.tsx");
    const quietHours = read("components/quiet-hours-settings.tsx");
    expect(forms).toContain('.eq("user_id", userId).select("user_id").single()');
    expect(quietHours).toContain('.eq("user_id", userId).select("user_id").single()');
  });

  it("separates a failed challenge load from a genuinely empty challenge", () => {
    const component = read("components/group-challenges.tsx");
    const query = read("lib/challenge-queries.ts");
    expect(query).toContain("loadError?: boolean");
    expect(component).toContain("챌린지를 불러오지 못했어요.");
    expect(component).toContain("[refreshBundle]");
  });
});
