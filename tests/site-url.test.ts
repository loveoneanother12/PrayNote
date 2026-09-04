import { describe, expect, it } from "vitest";
import { getSiteUrl } from "../lib/site-url";

describe("getSiteUrl", () => {
  it("prefers an explicitly configured site URL", () => {
    expect(
      getSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://praynote.example.com/",
        VERCEL_PROJECT_PRODUCTION_URL: "praynote.vercel.app",
      }),
    ).toBe("https://praynote.example.com");
  });

  it("uses the Vercel production domain when deployed", () => {
    expect(
      getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "praynote.vercel.app" }),
    ).toBe("https://praynote.vercel.app");
  });

  it("falls back to localhost for local development", () => {
    expect(getSiteUrl({})).toBe("http://localhost:3000");
  });
});
