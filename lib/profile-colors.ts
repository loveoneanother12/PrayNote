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
];

const values = new Set<ProfileColor>(PROFILE_COLORS.map((color) => color.value));

export function normalizeProfileColor(value: unknown): ProfileColor {
  return typeof value === "string" && values.has(value as ProfileColor) ? value as ProfileColor : "indigo";
}
