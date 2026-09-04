"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthIdentity } from "@/lib/auth";

const groupSchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(500).optional(),
});

export async function createGroup(formData: FormData) {
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=invalid-group");
  }

  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_group", {
    group_name: parsed.data.name,
    group_description: parsed.data.description ?? null,
  });

  if (error) {
    console.error("Failed to create group", { code: error.code, message: error.message });
    redirect("/dashboard?error=create-group-failed");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?created=group");
}
