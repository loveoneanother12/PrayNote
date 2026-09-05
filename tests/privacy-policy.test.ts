import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginPage = readFileSync("app/login/page.tsx", "utf8");
const privacyPage = readFileSync("app/privacy/page.tsx", "utf8");

describe("privacy policy", () => {
  it("links the login notice to the public privacy policy", () => {
    expect(loginPage).toContain('href="/privacy"');
    expect(loginPage).toContain("개인정보 처리방침");
    expect(loginPage).not.toContain("로그인 전 데모 화면 보기");
  });

  it("contains the supplied effective date and every policy section", () => {
    expect(privacyPage).toContain("시행일: 2026년 9월 1일");
    expect(privacyPage).toContain("hyunjae.lee.edu@gmail.com");

    for (let section = 1; section <= 8; section += 1) {
      expect(privacyPage).toContain(`<h2>${section}.`);
    }
  });
});
