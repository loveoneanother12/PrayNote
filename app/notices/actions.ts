"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const titleSchema = z.string().trim().min(2).max(100);
const contentSchema = z.string().trim().min(1).max(5000);
const idSchema = z.string().uuid();

async function requireSuperAdmin() {
  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);
  if (!user) redirect("/login?next=/notices");
  const { data: isSuperAdmin, error } = await supabase.rpc("is_super_admin");
  if (error || !isSuperAdmin) redirect("/notices?error=forbidden");
  return { supabase, user };
}

export async function createNotice(formData: FormData) {
  const title = titleSchema.safeParse(formData.get("title"));
  const content = contentSchema.safeParse(formData.get("content"));
  if (!title.success || !content.success) redirect("/notices?error=invalid-notice");

  const { supabase, user } = await requireSuperAdmin();
  const { error } = await supabase.from("notices").insert({
    title: title.data,
    content: content.data,
    created_by: user.id,
    is_published: true,
  });
  if (error) {
    console.error("Failed to create notice", { code: error.code, message: error.message });
    redirect("/notices?error=create-failed");
  }
  revalidatePath("/notices");
  redirect("/notices?created=1");
}

export async function deleteNotice(formData: FormData) {
  const noticeId = idSchema.safeParse(formData.get("noticeId"));
  if (!noticeId.success) redirect("/notices?error=invalid-notice");
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase.from("notices").delete().eq("id", noticeId.data);
  if (error) {
    console.error("Failed to delete notice", { code: error.code, message: error.message });
    redirect("/notices?error=delete-failed");
  }
  revalidatePath("/notices");
  redirect("/notices?deleted=1");
}
