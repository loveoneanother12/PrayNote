"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeInternalPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().min(8).max(72);
const displayNameSchema = z.string().trim().min(2).max(30);

function loginPath(mode: "login" | "signup", error: string, next: string) {
  return `/login?mode=${mode}&error=${error}&next=${encodeURIComponent(next)}`;
}

export async function signInWithPassword(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  const next = safeInternalPath(formData.get("next"));

  if (!email.success || !password.success) {
    redirect(loginPath("login", "invalid-login", next));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });

  if (error) {
    console.error("Password sign-in failed", { code: error.code, status: error.status });
    redirect(loginPath("login", "login-failed", next));
  }

  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  const passwordConfirm = formData.get("passwordConfirm");
  const displayName = displayNameSchema.safeParse(formData.get("displayName"));
  const next = safeInternalPath(formData.get("next"));
  const termsAgreed = formData.get("termsAgreed") === "yes";
  const ageConfirmed = formData.get("ageConfirmed") === "yes";
  const sensitiveInfoAgreed = formData.get("sensitiveInfoAgreed") === "yes";

  if (!email.success || !displayName.success) redirect(loginPath("signup", "invalid-signup", next));
  if (!password.success) redirect(loginPath("signup", "weak-password", next));
  if (password.data !== passwordConfirm) redirect(loginPath("signup", "password-mismatch", next));
  if (!termsAgreed) redirect(loginPath("signup", "agreement-required", next));
  if (!ageConfirmed) redirect(loginPath("signup", "age-required", next));
  if (!sensitiveInfoAgreed) redirect(loginPath("signup", "sensitive-consent-required", next));

  const supabase = await createClient();
  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      data: {
        display_name: displayName.data,
        terms_accepted_at: acceptedAt,
        privacy_accepted_at: acceptedAt,
        sensitive_info_accepted_at: acceptedAt,
        age_14_confirmed_at: acceptedAt,
        policy_version: "2026-09-06",
      },
    },
  });

  if (error) {
    console.error("Password sign-up failed", { code: error.code, status: error.status });
    const reason = error.code === "user_already_exists" ? "email-in-use" : "signup-failed";
    redirect(loginPath("signup", reason, next));
  }

  if (!data.session) {
    redirect(`/login?mode=login&notice=confirm-email&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
