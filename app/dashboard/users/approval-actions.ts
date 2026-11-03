"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    redirect("/dashboard");
  }
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Konfigurasi Supabase Admin belum lengkap.");
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function updateApprovalStatus(
  formData: FormData,
  status: "approved" | "rejected"
) {
  await checkAdmin();

  const userId = String(formData.get("user_id") || "");

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId
    )
  ) {
    redirect("/dashboard/users?error=invalid_user");
  }

  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from("profiles")
    .update({
      approval_status: status,
    })
    .eq("id", userId)
    .eq("approval_status", "pending")
    .in("role", ["parent", "teacher"])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Gagal memperbarui status akun:", error.message);
    redirect("/dashboard/users?error=approval_failed");
  }

  if (!data) {
    redirect("/dashboard/users?error=account_not_pending");
  }

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard");
  revalidatePath("/parent");
  revalidatePath("/teacher");
  revalidatePath("/pending-approval");

  redirect(
    `/dashboard/users?${status === "approved" ? "approved" : "rejected"}=1`
  );
}

export async function approveUserAccount(formData: FormData) {
  await updateApprovalStatus(formData, "approved");
}

export async function rejectUserAccount(formData: FormData) {
  await updateApprovalStatus(formData, "rejected");
}