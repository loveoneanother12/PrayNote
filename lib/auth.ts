import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthIdentity = { id: string; email: string | null };

export async function getAuthIdentity(supabase: SupabaseClient): Promise<AuthIdentity | null> {
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || !id) return null;
  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
}
