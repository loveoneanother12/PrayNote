import { redirect } from "next/navigation";
import { getAuthIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);

  redirect(user ? "/dashboard" : "/login");
}
