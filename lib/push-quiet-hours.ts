export type QuietHoursPreference = {
  quiet_hours_enabled?: boolean | null;
  quiet_start?: string | null;
  quiet_end?: string | null;
};

function minutesOf(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function koreaParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute") };
}

function koreaLocalToUtc(year: number, month: number, day: number, minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

export function quietHoursReleaseAt(preference: QuietHoursPreference | null | undefined, now = new Date()) {
  if (!preference?.quiet_hours_enabled) return null;
  const start = minutesOf(preference.quiet_start);
  const end = minutesOf(preference.quiet_end);
  if (start === null || end === null || start === end) return null;

  const local = koreaParts(now);
  const current = local.hour * 60 + local.minute;
  if (start < end) {
    if (current < start || current >= end) return null;
    return koreaLocalToUtc(local.year, local.month, local.day, end);
  }

  if (current < end) return koreaLocalToUtc(local.year, local.month, local.day, end);
  if (current < start) return null;
  return koreaLocalToUtc(local.year, local.month, local.day + 1, end);
}
