import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthIdentity = { id: string; email: string | null };

export async function getAuthIdentity(supabase: SupabaseClient): Promise<AuthIdentity | null> {
  // This is only a fast identity hint for rendering. Every data read and mutation
  // remains authorized by Supabase RLS/auth.uid(), which verifies the JWT.
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user.id) return null;
  return {
    id: data.session.user.id,
    email: data.session.user.email ?? null,
  };
}
