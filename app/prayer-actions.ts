"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeInternalPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();
const contentSchema = z.string().trim().min(1).max(2000);

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

export async function createPrayer(formData: FormData) {
  const groupIds = formData.getAll("groupIds")
    .map((value) => uuidSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);
  const personal = formData.get("personal") === "on";
  const content = contentSchema.safeParse(formData.get("content"));
  const returnTo = safeInternalPath(formData.get("returnTo"));

  if (!content.success || (!personal && groupIds.length === 0) || groupIds.length > 20) {
    redirect(`${returnTo}?error=invalid-prayer`);
  }

  const { supabase } = await requireUser();
  const { data: prayerId, error } = await supabase.rpc("create_prayer_with_groups", {
    prayer_content: content.data,
    target_group_ids: personal ? [] : [...new Set(groupIds)],
    is_personal: personal,
  });

  if (error) {
    console.error("Failed to create prayer", { code: error.code, message: error.message });
    redirect(`${returnTo}?error=create-prayer-failed`);
  }

  revalidatePath("/dashboard");
  for (const groupId of groupIds) revalidatePath(`/groups/${groupId}`);
  revalidatePath("/prayers");
  const separator = returnTo.includes("?") ? "&" : "?";
  const sharePrompt = !personal && returnTo.startsWith("/groups/") && prayerId
    ? `&prayerId=${encodeURIComponent(prayerId)}&share=1`
    : "";
  redirect(`${returnTo}${separator}created=prayer${sharePrompt}`);
}

export async function sharePrayerWithGroups(formData: FormData) {
  const prayerId = uuidSchema.safeParse(formData.get("prayerId"));
  const groupIds = formData.getAll("groupIds")
    .map((value) => uuidSchema.safeParse(value))
    .filter((result) => result.success)
    .map((result) => result.data);
  const returnTo = safeInternalPath(formData.get("returnTo"), "/dashboard");

  if (!prayerId.success || groupIds.length > 20) redirect(`${returnTo}?error=share-prayer-failed`);

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("share_prayer_with_groups", {
    target_prayer_id: prayerId.data,
    target_group_ids: [...new Set(groupIds)],
  });
  if (error) {
    console.error("Failed to share prayer", { code: error.code, message: error.message });
    redirect(`${returnTo}?error=share-prayer-failed`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/prayers");
  for (const groupId of groupIds) revalidatePath(`/groups/${groupId}`);
  redirect(`${returnTo}?shared=prayer`);
}

export async function togglePrayerCompleted(formData: FormData) {
  const prayerId = uuidSchema.safeParse(formData.get("prayerId"));
  const requestedStatus = formData.get("status") === "completed" ? "completed" : "active";
  const returnTo = safeInternalPath(formData.get("returnTo"), "/prayers");

  if (!prayerId.success) redirect(`${returnTo}?error=invalid-prayer`);

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("prayer_requests")
    .update({
      status: requestedStatus,
      completed_at: requestedStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", prayerId.data);

  if (error) {
    console.error("Failed to update prayer", { code: error.code, message: error.message });
    redirect(`${returnTo}?error=update-prayer-failed`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/prayers");
  revalidatePath(returnTo);
  redirect(`${returnTo}?updated=${requestedStatus}`);
}

export async function toggleTodayPrayer(formData: FormData) {
  const prayerId = uuidSchema.safeParse(formData.get("prayerId"));
  const returnTo = safeInternalPath(formData.get("returnTo"));

  if (!prayerId.success) redirect(`${returnTo}?error=invalid-prayer`);

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("toggle_prayer_response", {
    target_prayer_id: prayerId.data,
  });

  if (error) {
    console.error("Failed to toggle daily prayer", { code: error.code, message: error.message });
    redirect(`${returnTo}?error=prayer-response-failed`);
  }

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function updatePrayer(formData: FormData) {
  const prayerId = uuidSchema.safeParse(formData.get("prayerId"));
  const content = contentSchema.safeParse(formData.get("content"));
  const returnTo = safeInternalPath(formData.get("returnTo"), "/prayers");

  if (!prayerId.success || !content.success) redirect(`${returnTo}?error=invalid-prayer`);

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("prayer_requests")
    .update({ content: content.data })
    .eq("id", prayerId.data)
    .eq("author_id", user.id);

  if (error) {
    console.error("Failed to update prayer content", { code: error.code, message: error.message });
    redirect(`${returnTo}?error=update-prayer-failed`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/prayers");
  revalidatePath(returnTo);
  redirect(`${returnTo}?updated=content`);
}

export async function deletePrayer(formData: FormData) {
  const prayerId = uuidSchema.safeParse(formData.get("prayerId"));
  const returnTo = safeInternalPath(formData.get("returnTo"), "/prayers");

  if (!prayerId.success) redirect(`${returnTo}?error=invalid-prayer`);

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("prayer_requests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", prayerId.data)
    .eq("author_id", user.id);

  if (error) {
    console.error("Failed to delete prayer", { code: error.code, message: error.message });
    redirect(`${returnTo}?error=delete-prayer-failed`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/prayers");
  revalidatePath(returnTo);
  redirect(`${returnTo}?deleted=prayer`);
}
