"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSuperAdmin } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ itemId: z.string().uuid(), kind: z.enum(["report", "detection"]), decision: z.enum(["dismissed", "hidden", "deleted"]) });

export async function resolveModerationItem(formData: FormData) {
  const parsed = schema.safeParse({ itemId: formData.get("itemId"), kind: formData.get("kind"), decision: formData.get("decision") });
  if (!parsed.success) redirect("/admin/reports?error=invalid");
  const supabase = await createClient();
  if (!(await isSuperAdmin(supabase))) redirect("/dashboard");
  const { error } = await supabase.rpc("admin_resolve_moderation_item", { item_kind: parsed.data.kind, target_item_id: parsed.data.itemId, decision: parsed.data.decision });
  if (error) redirect("/admin/reports?error=failed");
  revalidatePath("/admin/reports"); revalidatePath("/dashboard");
  redirect(`/admin/reports?tab=${parsed.data.kind === "detection" ? "detections" : "reports"}&saved=1`);
}
