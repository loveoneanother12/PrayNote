import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { safeInternalPath } from "../lib/navigation";

const root = process.cwd();

describe("safeInternalPath", () => {
  it("keeps same-origin relative destinations", () => {
    expect(safeInternalPath("/groups/abc?view=all")).toBe("/groups/abc?view=all");
  });

  it("blocks external and protocol-relative redirects", () => {
    expect(safeInternalPath("https://example.com")).toBe("/dashboard");
    expect(safeInternalPath("//example.com", "/login")).toBe("/login");
  });
});

describe("group navigation", () => {
  it("opens the dedicated groups dashboard from desktop and mobile navigation", () => {
    const mobileNav = readFileSync(join(root, "components/mobile-nav.tsx"), "utf8");
    const desktopNav = readFileSync(join(root, "components/subpage-nav.tsx"), "utf8");
    const dashboard = readFileSync(join(root, "components/praynote-app.tsx"), "utf8");

    expect(mobileNav).toContain('href="/groups"');
    expect(desktopNav).toContain('href="/groups"');
    expect(dashboard).toContain('href="/groups"');
    expect(`${mobileNav}${desktopNav}`).not.toContain("/dashboard#groups");
  });
});
