"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const displayNameSchema = z.string().trim().min(2).max(30);
const passwordSchema = z.string().min(8).max(72);

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/settings");
  return { supabase, user: data.user };
}

export async function updateProfile(formData: FormData) {
  const displayName = displayNameSchema.safeParse(formData.get("displayName"));
  if (!displayName.success) redirect("/settings?error=invalid-name");

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName.data })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update profile", { code: error.code, message: error.message });
    redirect("/settings?error=profile-failed");
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/settings?saved=profile");
}

export async function updateNotificationPreferences(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notification_preferences")
    .update({
      in_app_enabled: formData.get("inAppEnabled") === "on",
      new_prayer_enabled: formData.get("newPrayerEnabled") === "on",
      prayer_response_enabled: formData.get("prayerResponseEnabled") === "on",
      membership_enabled: formData.get("membershipEnabled") === "on",
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update notification preferences", { code: error.code, message: error.message });
    redirect("/settings?error=preferences-failed");
  }

  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/settings");
  redirect("/settings?saved=notifications");
}

export async function updatePassword(formData: FormData) {
  const password = passwordSchema.safeParse(formData.get("password"));
  const passwordConfirm = formData.get("passwordConfirm");

  if (!password.success) redirect("/settings?error=weak-password");
  if (password.data !== passwordConfirm) redirect("/settings?error=password-mismatch");

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password: password.data });

  if (error) {
    console.error("Failed to update password", { code: error.code, status: error.status });
    redirect("/settings?error=password-failed");
  }

  redirect("/settings?saved=password");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?signedOut=1");
}
