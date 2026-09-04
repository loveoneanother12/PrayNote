"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeInternalPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

export async function markNotificationRead(formData: FormData) {
  const notificationId = uuidSchema.safeParse(formData.get("notificationId"));
  const destination = safeInternalPath(formData.get("destination"), "/notifications");
  if (!notificationId.success) redirect("/notifications?error=invalid-notification");

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId.data)
    .eq("recipient_id", user.id);

  if (error) {
    console.error("Failed to mark notification as read", { code: error.code, message: error.message });
    redirect("/notifications?error=read-failed");
  }

  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  redirect(destination);
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Failed to mark all notifications as read", { code: error.code, message: error.message });
    redirect("/notifications?error=read-failed");
  }

  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  redirect("/notifications?read=all");
}
