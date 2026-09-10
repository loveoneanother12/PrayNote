import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { onboardingDashboardPath, safeInternalPath } from "@/lib/navigation";

function validConsentTimestamp(value: string | undefined) {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function noStoreRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));
  const isSignup = url.searchParams.get("intent") === "signup";

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const acceptedAt = validConsentTimestamp(cookieStore.get("praynote_google_consent")?.value);
      if (acceptedAt) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const metadata = user.user_metadata ?? {};
          const displayName = String(metadata.display_name || metadata.full_name || metadata.name || user.email?.split("@")[0] || "기도하는 이").trim().slice(0, 30);
          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              display_name: displayName,
              terms_accepted_at: metadata.terms_accepted_at || acceptedAt,
              privacy_accepted_at: metadata.privacy_accepted_at || acceptedAt,
              sensitive_info_accepted_at: metadata.sensitive_info_accepted_at || acceptedAt,
              age_14_confirmed_at: metadata.age_14_confirmed_at || acceptedAt,
              policy_version: metadata.policy_version || "2026-09-06",
            },
          });
          if (metadataError) console.error("Google consent metadata update failed", { code: metadataError.code, status: metadataError.status });
          const { error: profileError } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
          if (profileError) console.error("Google profile name update failed", { code: profileError.code, message: profileError.message });
        }
        cookieStore.delete("praynote_google_consent");
      }
      return noStoreRedirect(new URL(isSignup ? onboardingDashboardPath(next) : next, url.origin));
    }
  }

  const errorPath = next.startsWith("/settings")
    ? "/settings?error=google-link-failed"
    : next.startsWith("/prayers")
      ? "/prayers?error=google-link-failed"
      : "/login?error=callback-failed";
  return noStoreRedirect(new URL(errorPath, url.origin));
}
