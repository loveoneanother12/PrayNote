import { NextResponse } from "next/server";
import { getAuthIdentity } from "@/lib/auth";
import { sendTestPush } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await sendTestPush(user.id);
    return NextResponse.json(result, { status: result.delivered > 0 ? 200 : 404 });
  } catch (error) {
    console.error("Test push failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }
}
