import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";

describe("installable PrayNote PWA", () => {
  it("uses standalone display mode and install icons", () => {
    const value = manifest();
    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/dashboard");
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", type: "image/png" }),
    ]));
  });

  it("opens notification destinations without embedding prayer content", () => {
    const worker = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
    expect(worker).toContain('self.addEventListener("push"');
    expect(worker).toContain('self.addEventListener("notificationclick"');
    expect(worker).not.toMatch(/prayer_(content|body)|기도제목 원문/i);
  });
});
