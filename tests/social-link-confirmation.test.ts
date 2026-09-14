import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { decodePendingSocialLink, encodePendingSocialLink, newlyAutoLinkedIdentity } from "../lib/social-link-confirmation";

function userWithIdentities(userCreatedAt: string, providerCreatedAt: string, identityCount = 2) {
  return {
    id: "user-1",
    created_at: userCreatedAt,
    identities: [
      { id: "email-1", provider: "email", created_at: userCreatedAt },
      ...(identityCount > 1 ? [{ id: "google-1", provider: "google", created_at: providerCreatedAt }] : []),
    ],
  } as unknown as User;
}

describe("social identity confirmation", () => {
  it("detects a provider identity newly added to an older account", () => {
    const startedAt = Date.now() - 2_000;
    const user = userWithIdentities(
      new Date(startedAt - 86_400_000).toISOString(),
      new Date(startedAt + 1_000).toISOString(),
    );
    expect(newlyAutoLinkedIdentity(user, "google", startedAt)?.id).toBe("google-1");
  });

  it("does not interrupt a normal login with an already-linked provider", () => {
    const startedAt = Date.now() - 2_000;
    const user = userWithIdentities(
      new Date(startedAt - 86_400_000).toISOString(),
      new Date(startedAt - 43_200_000).toISOString(),
    );
    expect(newlyAutoLinkedIdentity(user, "google", startedAt)).toBeNull();
  });

  it("does not treat a brand-new social account as an existing account", () => {
    const startedAt = Date.now() - 2_000;
    const createdAt = new Date(startedAt + 1_000).toISOString();
    const user = userWithIdentities(createdAt, createdAt, 1);
    expect(newlyAutoLinkedIdentity(user, "google", startedAt)).toBeNull();
  });

  it("round-trips pending confirmation data without trusting malformed cookies", () => {
    const pending = { provider: "apple" as const, identityId: "apple-1", userId: "user-1", next: "/dashboard" };
    expect(decodePendingSocialLink(encodePendingSocialLink(pending))).toEqual(pending);
    expect(decodePendingSocialLink("not-valid")).toBeNull();
  });
});
