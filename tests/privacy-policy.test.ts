import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginPage = readFileSync("app/login/page.tsx", "utf8");
const loginActions = readFileSync("app/login/actions.ts", "utf8");
const privacyPage = readFileSync("app/privacy/page.tsx", "utf8");
const termsPage = readFileSync("app/terms/page.tsx", "utf8");

describe("legal documents and signup consent", () => {
  it("links both public legal documents from login", () => {
    expect(loginPage).toContain('href="/privacy"');
    expect(loginPage).toContain('href="/terms"');
    expect(loginPage).toContain("개인정보처리방침");
    expect(loginPage).not.toContain("로그인 전 데모 화면 보기");
  });

  it("publishes the revised privacy policy with sensitive-data and vendor disclosures", () => {
    expect(privacyPage).toContain('effectiveDate="2026년 9월 6일"');
    expect(privacyPage).toContain("hyunjae.lee.edu@gmail.com");
    expect(privacyPage).toContain("개인정보 보호법 제23조");
    expect(privacyPage).toContain("Supabase, Inc.");
    expect(privacyPage).toContain("Vercel Inc.");
    expect(privacyPage).toContain("ap-northeast-2");
    expect(privacyPage).toContain("icn1");
    expect(privacyPage).toContain("(탈퇴한 사용자)");
  });

  it("publishes terms matching the product and withdrawal policy", () => {
    expect(termsPage).toContain("제13조 (준거법·재판관할 및 문의)");
    expect(termsPage).toContain("만 14세 이상");
    expect(termsPage).toContain("네, 삭제하겠습니다");
    expect(termsPage).toContain("(탈퇴한 사용자)");
    expect(termsPage).not.toContain("댓글");
  });

  it("requires and records separate signup confirmations", () => {
    expect(loginPage).toContain('name="termsAgreed"');
    expect(loginPage).toContain('name="ageConfirmed"');
    expect(loginPage).toContain('name="sensitiveInfoAgreed"');
    expect(loginActions).toContain('policy_version: "2026-09-06"');
    expect(loginActions).toContain("sensitive_info_accepted_at");
  });

  it("removes the legacy magic-link account conversion flow", () => {
    expect(loginPage).not.toContain("기존 메일 링크 계정 전환");
    expect(loginPage).not.toContain("mode=magic");
    expect(loginActions).not.toContain("requestMagicLink");
    expect(loginActions).not.toContain("signInWithOtp");
  });
});
