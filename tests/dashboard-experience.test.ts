import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getKoreaGreeting } from "../lib/dates";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Korea-time dashboard greeting", () => {
  it("uses all six four-hour periods", () => {
    const greetings = [0, 4, 8, 12, 16, 20].map((hour) => getKoreaGreeting(new Date(`2026-09-06T${String(hour).padStart(2, "0")}:00:00+09:00`)));
    expect(new Set(greetings)).toHaveLength(6);
  });

  it("alternates the phrase on adjacent Korea dates", () => {
    const first = getKoreaGreeting(new Date("2026-09-05T23:00:00Z"));
    const next = getKoreaGreeting(new Date("2026-09-06T23:00:00Z"));
    expect(first).not.toBe(next);
  });
});

describe("installation guide and daily verse", () => {
  it("includes separate iOS and Android installation instructions", () => {
    const guide = read("components/install-guide-modal.tsx");
    expect(guide).toContain("iOS · iPhone");
    expect(guide).toContain("Android");
    expect(guide).toContain("홈 화면에 추가");
    expect(guide).toContain("세부정보 더보기");
  });

  it("does not publish a static verse-of-the-day card", () => {
    expect(read("components/praynote-app.tsx")).not.toContain("verse-card");
  });
});
