"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthIdentity } from "@/lib/auth";

const displayNameSchema = z.string().trim().min(2).max(30);
const passwordSchema = z.string().min(8).max(72);

export type DeleteAccountState = { error: string };

async function requireUser() {
  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);
  if (!user) redirect("/login?next=/settings");
  return { supabase, user };
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

export async function deleteAccount(
  _previousState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  if (formData.get("withdrawalConfirmed") !== "yes") {
    return { error: "탈퇴 안내 확인란에 체크해주세요." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_my_account", {
    delete_all_prayers: formData.get("deleteAllPrayers") === "yes",
    confirmation: "DELETE_MY_ACCOUNT",
  });

  if (error) {
    console.error("Failed to delete account", { code: error.code, message: error.message });
    return { error: "회원 탈퇴를 처리하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?notice=account-deleted");
}
