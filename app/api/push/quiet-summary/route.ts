import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchQuietHoursSummaries } from "@/lib/push";

export const runtime = "nodejs";

function secretsMatch(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!secretsMatch(request.headers.get("x-praynote-push-secret"), process.env.PUSH_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await dispatchQuietHoursSummaries());
  } catch (error) {
    console.error("Quiet-hours summary push failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }
}
