"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeInternalPath } from "@/lib/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().min(8).max(72);
const displayNameSchema = z.string().trim().min(2).max(30);

function loginPath(mode: "login" | "signup" | "magic", error: string, next: string) {
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

  if (!email.success || !displayName.success) redirect(loginPath("signup", "invalid-signup", next));
  if (!password.success) redirect(loginPath("signup", "weak-password", next));
  if (password.data !== passwordConfirm) redirect(loginPath("signup", "password-mismatch", next));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { data: { display_name: displayName.data } },
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

export async function requestMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const next = safeInternalPath(formData.get("next"));

  if (!parsed.success) redirect(loginPath("magic", "invalid-email", next));

  const siteUrl = getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error("Magic-link sign-in failed", { code: error.code, status: error.status });
    redirect(loginPath("magic", error.status === 429 ? "email-rate-limit" : "send-failed", next));
  }

  redirect(`/login?mode=magic&sent=${encodeURIComponent(parsed.data)}&next=${encodeURIComponent(next)}`);
}
