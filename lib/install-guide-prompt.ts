export const INSTALL_GUIDE_DISMISSED_DATE_KEY = "praynote_install_guide_dismissed_date";
export const INSTALL_GUIDE_NEXT_PROMPT_KEY = "praynote_install_guide_next_prompt_at";
export const INSTALL_GUIDE_REPEAT_MS = 4 * 60 * 60 * 1000;
export const INSTALL_GUIDE_AUTO_PROMPT_END_AT = Date.parse("2026-09-13T00:00:00+09:00");

export function isInstallGuideAutoPromptActive(date = new Date()) {
  return date.getTime() < INSTALL_GUIDE_AUTO_PROMPT_END_AT;
}

export function getKoreaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function millisecondsUntilNextKoreaDay(date = new Date()) {
  const [year, month, day] = getKoreaDateKey(date).split("-").map(Number);
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1) - 9 * 60 * 60 * 1000;
  return Math.max(nextMidnightUtc - date.getTime(), 0);
}

export function installGuidePromptDelay({
  now = new Date(),
  dismissedDate,
  nextPromptAt,
}: {
  now?: Date;
  dismissedDate: string | null;
  nextPromptAt: number | null;
}) {
  if (dismissedDate === getKoreaDateKey(now)) return millisecondsUntilNextKoreaDay(now);
  if (nextPromptAt && nextPromptAt > now.getTime()) return nextPromptAt - now.getTime();
  return 0;
}
