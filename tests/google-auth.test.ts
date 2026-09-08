import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const loginActions = readFileSync(join(root, "app/login/actions.ts"), "utf8");
const callback = readFileSync(join(root, "app/auth/callback/route.ts"), "utf8");
const settingsIdentity = readFileSync(join(root, "components/google-identity-settings.tsx"), "utf8");

describe("Google authentication", () => {
  it("requires legal, age, and sensitive-information consent before OAuth signup", () => {
    expect(loginActions).toContain('formData.get("termsAgreed") === "yes"');
    expect(loginActions).toContain('formData.get("ageConfirmed") === "yes"');
    expect(loginActions).toContain('formData.get("sensitiveInfoAgreed") === "yes"');
    expect(loginActions).toContain('provider: "google"');
  });

  it("records Google consent only after a successful PKCE callback", () => {
    expect(callback).toContain('exchangeCodeForSession(code)');
    expect(callback).toContain('praynote_google_consent');
    expect(callback).toContain('sensitive_info_accepted_at');
    expect(callback).toContain('cookieStore.delete("praynote_google_consent")');
  });

  it("links Google as an identity of the current Supabase user", () => {
    expect(settingsIdentity).toContain('getUserIdentities()');
    expect(settingsIdentity).toContain('linkIdentity({ provider: "google"');
    expect(settingsIdentity).toContain('returnTo = "/settings"');
    expect(settingsIdentity).toContain('`${returnTo}${separator}linked=google`');
  });
});
