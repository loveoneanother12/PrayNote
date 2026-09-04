import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPrayerReminderPush } from "@/lib/push";

export const runtime = "nodejs";

const payloadSchema = z.object({
  user_id: z.string().uuid(),
  reminder_id: z.string().uuid(),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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
    const result = await sendPrayerReminderPush(
      parsed.data.user_id,
      parsed.data.reminder_id,
      parsed.data.delivery_date,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Prayer reminder push failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }
}
