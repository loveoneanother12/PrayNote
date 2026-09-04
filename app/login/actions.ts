"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeInternalPath } from "@/lib/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email();

export async function requestMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    redirect("/login?error=invalid-email");
  }

  const next = safeInternalPath(formData.get("next"));
  const siteUrl = getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    redirect("/login?error=send-failed");
  }

  redirect(`/login?sent=${encodeURIComponent(parsed.data)}&next=${encodeURIComponent(next)}`);
}
