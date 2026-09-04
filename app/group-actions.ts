"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthIdentity } from "@/lib/auth";

const uuidSchema = z.string().uuid();
const inviteCodeSchema = z.string().trim().toUpperCase().regex(/^PRAY-[A-F0-9]{8}$/);
const groupSchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(500).optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const user = await getAuthIdentity(supabase);
  if (!user) redirect("/login");
  return supabase;
}

export async function requestMembership(formData: FormData) {
  const code = inviteCodeSchema.safeParse(formData.get("inviteCode"));
  const groupId = uuidSchema.safeParse(formData.get("groupId"));
  const fallback = groupId.success ? `/join/${groupId.data}` : "/join";

  if (!code.success) redirect(`${fallback}?error=invalid-code`);

  const supabase = await requireUser();
  const result = groupId.success
    ? await supabase.rpc("request_group_membership", { target_group_id: groupId.data, submitted_code: code.data })
    : await supabase.rpc("request_group_membership_by_code", { submitted_code: code.data });

  if (result.error) {
    console.error("Failed to request membership", { code: result.error.code, message: result.error.message });
    const reason = result.error.message.includes("invalid_invite_code") ? "invalid-code" : "join-failed";
    redirect(`${fallback}?error=${reason}`);
  }

  revalidatePath("/dashboard");
  redirect(`${fallback}?requested=1`);
}

export async function reviewMembership(formData: FormData) {
  const membershipId = uuidSchema.safeParse(formData.get("membershipId"));
  const groupId = uuidSchema.safeParse(formData.get("groupId"));
  const approve = formData.get("decision") === "approve";
  if (!membershipId.success || !groupId.success) redirect("/dashboard?error=invalid-membership");

  const supabase = await requireUser();
  const { error } = await supabase.rpc("review_membership", {
    membership_id: membershipId.data,
    approve,
  });

  if (error) {
    console.error("Failed to review membership", { code: error.code, message: error.message });
    redirect(`/groups/${groupId.data}/manage?error=review-failed`);
  }

  revalidatePath(`/groups/${groupId.data}`);
  revalidatePath(`/groups/${groupId.data}/manage`);
  redirect(`/groups/${groupId.data}/manage?reviewed=${approve ? "approved" : "rejected"}`);
}

export async function changeAdminRole(formData: FormData) {
  const groupId = uuidSchema.safeParse(formData.get("groupId"));
  const userId = uuidSchema.safeParse(formData.get("userId"));
  const makeAdmin = formData.get("makeAdmin") === "true";
  if (!groupId.success || !userId.success) redirect("/dashboard?error=invalid-membership");

  const supabase = await requireUser();
  const { error } = await supabase.rpc("set_group_admin", {
    target_group_id: groupId.data,
    target_user_id: userId.data,
    make_admin: makeAdmin,
  });

  if (error) {
    console.error("Failed to change admin role", { code: error.code, message: error.message });
    redirect(`/groups/${groupId.data}/manage?error=role-failed`);
  }

  revalidatePath(`/groups/${groupId.data}/manage`);
  redirect(`/groups/${groupId.data}/manage?role=${makeAdmin ? "admin" : "member"}`);
}

export async function updateGroup(formData: FormData) {
  const groupId = uuidSchema.safeParse(formData.get("groupId"));
  const group = groupSchema.safeParse({ name: formData.get("name"), description: formData.get("description") || undefined });
  if (!groupId.success || !group.success) redirect("/dashboard?error=invalid-group");

  const supabase = await requireUser();
  const { error } = await supabase.rpc("update_group_details", {
    target_group_id: groupId.data,
    group_name: group.data.name,
    group_description: group.data.description ?? null,
  });

  if (error) {
    console.error("Failed to update group", { code: error.code, message: error.message });
    redirect(`/groups/${groupId.data}/manage?error=update-failed`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId.data}`);
  revalidatePath(`/groups/${groupId.data}/manage`);
  redirect(`/groups/${groupId.data}/manage?updated=group`);
}

export async function leaveGroup(formData: FormData) {
  const groupId = uuidSchema.safeParse(formData.get("groupId"));
  if (!groupId.success) redirect("/dashboard?error=invalid-group");

  const supabase = await requireUser();
  const { error } = await supabase.rpc("leave_group", { target_group_id: groupId.data });
  if (error) {
    console.error("Failed to leave group", { code: error.code, message: error.message });
    redirect(`/groups/${groupId.data}/manage?error=leave-failed`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?left=group");
}

export async function deleteGroup(formData: FormData) {
  const groupId = uuidSchema.safeParse(formData.get("groupId"));
  if (!groupId.success) redirect("/dashboard?error=invalid-group");

  const supabase = await requireUser();
  const { error } = await supabase.rpc("delete_group", { target_group_id: groupId.data });
  if (error) {
    console.error("Failed to delete group", { code: error.code, message: error.message });
    redirect(`/groups/${groupId.data}/manage?error=delete-failed`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=group");
}
