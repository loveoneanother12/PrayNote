import { describe, expect, it } from "vitest";
import {
  getKoreaDateKey,
  isInstallGuideAutoPromptActive,
  INSTALL_GUIDE_REPEAT_MS,
  installGuidePromptDelay,
  millisecondsUntilNextKoreaDay,
} from "../lib/install-guide-prompt";

describe("install guide prompt schedule", () => {
  const koreaEvening = new Date("2026-09-10T14:00:00.000Z");

  it("uses the Korea calendar date", () => {
    expect(getKoreaDateKey(koreaEvening)).toBe("2026-09-10");
  });

  it("waits until Korea midnight after dismissing for today", () => {
    expect(installGuidePromptDelay({ now: koreaEvening, dismissedDate: "2026-09-10", nextPromptAt: null })).toBe(60 * 60 * 1000);
    expect(millisecondsUntilNextKoreaDay(koreaEvening)).toBe(60 * 60 * 1000);
  });

  it("reappears four hours after a normal close", () => {
    expect(installGuidePromptDelay({ now: koreaEvening, dismissedDate: null, nextPromptAt: koreaEvening.getTime() + INSTALL_GUIDE_REPEAT_MS })).toBe(INSTALL_GUIDE_REPEAT_MS);
  });

  it("opens immediately when no suppression remains", () => {
    expect(installGuidePromptDelay({ now: koreaEvening, dismissedDate: "2026-09-09", nextPromptAt: koreaEvening.getTime() - 1 })).toBe(0);
  });

  it("stops automatic prompts after September 12 in Korea", () => {
    expect(isInstallGuideAutoPromptActive(new Date("2026-09-12T14:59:59.999Z"))).toBe(true);
    expect(isInstallGuideAutoPromptActive(new Date("2026-09-12T15:00:00.000Z"))).toBe(false);
  });
});
