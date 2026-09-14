import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const loginActions = readFileSync(join(root, "app/login/actions.ts"), "utf8");
const callback = readFileSync(join(root, "app/auth/callback/route.ts"), "utf8");
const loginPage = readFileSync(join(root, "app/login/page.tsx"), "utf8");
const settingsIdentity = readFileSync(join(root, "components/oauth-identity-settings.tsx"), "utf8");
const confirmLinkPage = readFileSync(join(root, "app/auth/confirm-link/page.tsx"), "utf8");
const confirmLinkActions = readFileSync(join(root, "app/auth/confirm-link/actions.ts"), "utf8");
const authConfig = readFileSync(join(root, "supabase/config.toml"), "utf8");
const proxy = readFileSync(join(root, "proxy.ts"), "utf8");

describe("social authentication", () => {
  it("requires legal, age, and sensitive-information consent before OAuth signup", () => {
    expect(loginActions).toContain('formData.get("termsAgreed") === "yes"');
    expect(loginActions).toContain('formData.get("ageConfirmed") === "yes"');
    expect(loginActions).toContain('formData.get("sensitiveInfoAgreed") === "yes"');
    expect(loginActions).toContain('signInWithOAuthProvider(formData, "google")');
    expect(loginActions).toContain('signInWithOAuthProvider(formData, "apple")');
  });

  it("records Google consent only after a successful PKCE callback", () => {
    expect(callback).toContain('exchangeCodeForSession(code)');
    expect(callback).toContain('`praynote_${provider}_consent`');
    expect(callback).toContain('sensitive_info_accepted_at');
    expect(callback).toContain('cookieStore.delete(consentCookie)');
  });

  it("links Google and Apple as identities of the current Supabase user", () => {
    expect(settingsIdentity).toContain('getUserIdentities()');
    expect(settingsIdentity).toContain('linkIdentity({ provider');
    expect(settingsIdentity).toContain('{ provider: "google"');
    expect(settingsIdentity).toContain('{ provider: "apple"');
    expect(settingsIdentity).toContain('returnTo = "/settings"');
    expect(settingsIdentity).toContain('`${returnTo}${separator}linked=${provider}`');
    expect(loginPage).toContain('NEXT_PUBLIC_APPLE_SIGN_IN_ENABLED');
    expect(loginPage).toContain('<AppleAuthButton mode={mode} next={next} />');
  });

  it("requires explicit confirmation when OAuth automatically matches an existing email", () => {
    expect(callback).toContain("newlyAutoLinkedIdentity");
    expect(callback).toContain('new URL("/auth/confirm-link"');
    expect(confirmLinkPage).toContain("동일한 이메일로 가입된 계정이 있습니다.");
    expect(confirmLinkPage).toContain("본인이신가요?");
    expect(confirmLinkActions).toContain("unlinkIdentity");
    expect(confirmLinkActions).toContain("confirmSocialLink");
    expect(proxy).toContain('pathname === "/auth/confirm-link" && (!isAuthenticated || !hasPendingSocialLink)');
  });

  it("requires email verification for new password accounts", () => {
    expect(authConfig).toContain("enable_confirmations = true");
    expect(loginActions).toContain("emailRedirectTo:");
    expect(loginActions).toContain("provider=email");
  });
});
