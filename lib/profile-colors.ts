import type { ProfileColor } from "./domain";

export const PROFILE_COLORS: Array<{ value: ProfileColor; label: string }> = [
  { value: "indigo", label: "인디고" },
  { value: "sky", label: "하늘" },
  { value: "teal", label: "청록" },
  { value: "green", label: "초록" },
  { value: "amber", label: "노랑" },
  { value: "rose", label: "장미" },
  { value: "violet", label: "보라" },
  { value: "slate", label: "회색" },
  { value: "coral", label: "산호" },
  { value: "orange", label: "주황" },
  { value: "lime", label: "라임" },
  { value: "mint", label: "민트" },
  { value: "cyan", label: "시안" },
  { value: "blue", label: "파랑" },
  { value: "navy", label: "남색" },
  { value: "grape", label: "포도" },
  { value: "magenta", label: "자홍" },
  { value: "red", label: "빨강" },
  { value: "brown", label: "갈색" },
  { value: "charcoal", label: "먹색" },
];

const values = new Set<ProfileColor>(PROFILE_COLORS.map((color) => color.value));

export function normalizeProfileColor(value: unknown): ProfileColor {
  return typeof value === "string" && values.has(value as ProfileColor) ? value as ProfileColor : "indigo";
}
