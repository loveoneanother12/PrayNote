import type { ProfileColor } from "./domain";

export const PROFILE_COLORS: Array<{ value: ProfileColor; label: string }> = [
  { value: "blush", label: "블러시" },
  { value: "rose", label: "로즈" },
  { value: "red", label: "레드" },
  { value: "coral", label: "코랄" },
  { value: "peach", label: "피치" },
  { value: "orange", label: "오렌지" },
  { value: "butter", label: "버터" },
  { value: "amber", label: "앰버" },
  { value: "lime", label: "라임" },
  { value: "sage", label: "세이지" },
  { value: "green", label: "그린" },
  { value: "mint", label: "민트" },
  { value: "aqua", label: "아쿠아" },
  { value: "teal", label: "틸" },
  { value: "cyan", label: "시안" },
  { value: "sky", label: "스카이" },
  { value: "blue", label: "블루" },
  { value: "periwinkle", label: "페리윙클" },
  { value: "indigo", label: "인디고" },
  { value: "navy", label: "네이비" },
  { value: "lavender", label: "라벤더" },
  { value: "violet", label: "바이올렛" },
  { value: "lilac", label: "라일락" },
  { value: "grape", label: "그레이프" },
  { value: "magenta", label: "마젠타" },
  { value: "brown", label: "브라운" },
  { value: "slate", label: "슬레이트" },
  { value: "charcoal", label: "차콜" },
];

const values = new Set<ProfileColor>(PROFILE_COLORS.map((color) => color.value));

export function normalizeProfileColor(value: unknown): ProfileColor {
  return typeof value === "string" && values.has(value as ProfileColor) ? value as ProfileColor : "indigo";
}
