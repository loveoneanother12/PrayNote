import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPushForNotification } from "@/lib/push";

export const runtime = "nodejs";

const payloadSchema = z.object({ notification_id: z.string().uuid() });

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

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    const result = await sendPushForNotification(parsed.data.notification_id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Push delivery failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }
}
