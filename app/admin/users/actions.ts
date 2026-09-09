"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSuperAdmin } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";

const userIdSchema = z.string().uuid();

async function requireAdmin() {
  const supabase = await createClient();
  if (!(await isSuperAdmin(supabase))) redirect("/dashboard");
  return supabase;
}

function targetId(formData: FormData) {
  const parsed = userIdSchema.safeParse(formData.get("userId"));
  if (!parsed.success) redirect("/admin/users?error=invalid-user");
  return parsed.data;
}

export async function setUserSuspension(formData: FormData) {
  const supabase = await requireAdmin();
  const shouldSuspend = formData.get("shouldSuspend") === "yes";
  const { error } = await supabase.rpc("admin_set_user_suspension", { target_user_id: targetId(formData), should_suspend: shouldSuspend });
  if (error) redirect("/admin/users?error=action-failed");
  revalidatePath("/admin");
  redirect(`/admin/users?saved=${shouldSuspend ? "suspended" : "unsuspended"}`);
}

export async function forceUserSignOut(formData: FormData) {
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_force_sign_out", { target_user_id: targetId(formData) });
  if (error) redirect("/admin/users?error=action-failed");
  revalidatePath("/admin");
  redirect("/admin/users?saved=signed-out");
}

export async function deleteUserByAdmin(formData: FormData) {
  const email = z.string().trim().email().safeParse(formData.get("confirmationEmail"));
  if (!email.success) redirect("/admin/users?error=confirmation");
  const supabase = await requireAdmin();
  const { error } = await supabase.rpc("admin_delete_user", {
    target_user_id: targetId(formData),
    confirmation_email: email.data,
    delete_all_prayers: formData.get("deleteAllPrayers") === "yes",
  });
  if (error) redirect(`/admin/users?error=${error.message.includes("confirmation_mismatch") ? "confirmation" : "action-failed"}`);
  revalidatePath("/admin");
  redirect("/admin/users?saved=deleted");
}
