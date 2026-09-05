const KOREA_TIME_ZONE = "Asia/Seoul";

export function koreaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatKoreaDate(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function formatKoreaDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KOREA_TIME_ZONE,
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatKoreaToday(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KOREA_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

const koreaGreetings = [
  ["고요한 밤이에요", "기도로 하루를 품는 밤이에요"],
  ["새벽의 평안이 함께해요", "새로운 하루가 밝아와요"],
  ["좋은 아침이에요", "기쁨 가득한 아침이에요"],
  ["평안한 오후예요", "따뜻한 오후예요"],
  ["오늘도 수고 많았어요", "저녁의 평안이 함께해요"],
  ["편안한 밤이에요", "하루를 기도로 마무리해요"],
] as const;

export function getKoreaGreeting(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const hour = value("hour");
  const alternate = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000) % 2;
  return koreaGreetings[Math.floor(hour / 4)][alternate];
}
