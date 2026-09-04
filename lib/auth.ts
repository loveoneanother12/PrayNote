import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthIdentity = { id: string; email: string | null };

export async function getAuthIdentity(supabase: SupabaseClient): Promise<AuthIdentity | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
}
