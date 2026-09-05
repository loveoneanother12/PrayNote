import type { ProfileColor } from "@/lib/domain";
import { normalizeProfileColor } from "@/lib/profile-colors";

export function ProfileDot({ color, label, size = "medium", className = "" }: { color?: ProfileColor | string | null; label: string; size?: "small" | "medium" | "large"; className?: string }) {
  return <span className={`profile-dot profile-color-${normalizeProfileColor(color)} ${size} ${className}`.trim()} role="img" aria-label={`${label}의 프로필 색상`} />;
}
