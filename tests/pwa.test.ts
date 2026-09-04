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

  it("keeps the same five-item mobile navigation on every signed-in page", () => {
    const mobileNav = readFileSync(join(process.cwd(), "components/mobile-nav.tsx"), "utf8");
    expect(mobileNav).toContain("홈");
    expect(mobileNav).toContain("그룹");
    expect(mobileNav).toContain("내 기도");
    expect(mobileNav).toContain("설정");
    expect(mobileNav).not.toContain("<span>알림</span>");
    expect(mobileNav.indexOf("홈")).toBeLessThan(mobileNav.indexOf("그룹"));
    expect(mobileNav.indexOf("그룹")).toBeLessThan(mobileNav.indexOf("내 기도"));
    expect(mobileNav.indexOf("내 기도")).toBeLessThan(mobileNav.indexOf("설정"));
  });

  it("disables server-action buttons while their work is pending", () => {
    const pendingButton = readFileSync(join(process.cwd(), "components/pending-submit-button.tsx"), "utf8");
    expect(pendingButton).toContain("useFormStatus");
    expect(pendingButton).toContain("disabled={disabled || pending}");
    expect(pendingButton).toContain('aria-busy={pending}');
  });
});
