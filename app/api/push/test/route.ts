import { NextResponse } from "next/server";
import { sendTestPush } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await sendTestPush(data.user.id);
    return NextResponse.json(result, { status: result.delivered > 0 ? 200 : 404 });
  } catch (error) {
    console.error("Test push failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }
}
