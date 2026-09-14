"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { decodePendingSocialLink, PENDING_SOCIAL_LINK_COOKIE } from "@/lib/social-link-confirmation";

async function getVerifiedPendingLink() {
  const cookieStore = await cookies();
  const pending = decodePendingSocialLink(cookieStore.get(PENDING_SOCIAL_LINK_COOKIE)?.value);
  if (!pending) return null;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.id !== pending.userId) return null;
  const identity = user.identities?.find((item) => item.id === pending.identityId && item.provider === pending.provider);
  if (!identity) return null;
  return { cookieStore, pending, supabase, identity };
}

export async function confirmSocialLink() {
  const verified = await getVerifiedPendingLink();
  if (!verified) redirect("/login?error=link-confirmation-expired");

  verified.cookieStore.delete(PENDING_SOCIAL_LINK_COOKIE);
  const next = safeInternalPath(verified.pending.next);
  const separator = next.includes("?") ? "&" : "?";
  redirect(`${next}${separator}linked=${verified.pending.provider}`);
}

export async function rejectSocialLink() {
  const verified = await getVerifiedPendingLink();
  if (!verified) redirect("/login?error=link-confirmation-expired");

  const { error } = await verified.supabase.auth.unlinkIdentity(verified.identity);
  verified.cookieStore.delete(PENDING_SOCIAL_LINK_COOKIE);
  if (error) {
    console.error("Automatic social identity rollback failed", { code: error.code, status: error.status });
    await verified.supabase.auth.signOut();
    redirect("/login?error=link-cancel-failed");
  }

  await verified.supabase.auth.signOut();
  redirect("/login?notice=link-cancelled");
}
