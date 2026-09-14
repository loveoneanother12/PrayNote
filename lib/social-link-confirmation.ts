import type { User } from "@supabase/supabase-js";

export const PENDING_SOCIAL_LINK_COOKIE = "praynote_pending_social_link";

export type SocialProvider = "google" | "apple";

export type PendingSocialLink = {
  provider: SocialProvider;
  identityId: string;
  userId: string;
  next: string;
};

export function encodePendingSocialLink(value: PendingSocialLink) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodePendingSocialLink(value: string | undefined): PendingSocialLink | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<PendingSocialLink>;
    if (
      (parsed.provider !== "google" && parsed.provider !== "apple")
      || typeof parsed.identityId !== "string"
      || typeof parsed.userId !== "string"
      || typeof parsed.next !== "string"
    ) return null;
    return parsed as PendingSocialLink;
  } catch {
    return null;
  }
}

export function newlyAutoLinkedIdentity(user: User, provider: SocialProvider, oauthStartedAt: number | null) {
  if (!oauthStartedAt) return null;
  const identity = user.identities?.find((item) => item.provider === provider);
  if (!identity?.created_at || (user.identities?.length ?? 0) < 2) return null;

  const identityCreatedAt = Date.parse(identity.created_at);
  const userCreatedAt = Date.parse(user.created_at);
  const startedRecently = Number.isFinite(identityCreatedAt)
    && identityCreatedAt >= oauthStartedAt - 60_000
    && identityCreatedAt <= Date.now() + 60_000;
  const accountExistedFirst = Number.isFinite(userCreatedAt)
    && identityCreatedAt - userCreatedAt > 5_000;

  return startedRecently && accountExistedFirst ? identity : null;
}
