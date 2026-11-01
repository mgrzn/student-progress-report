
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error("Akses hanya untuk Admin.");
  }

  return supabase;
}

function refreshPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/periods");
  revalidatePath("/dashboard/assessments");
  revalidatePath("/dashboard/reports");
}

export async function createPeriod(formData: FormData) {
  const supabase = await checkAdmin();

  const academic_year = String(formData.get("academic_year") || "").trim();
  const semester = String(formData.get("semester") || "").trim();
  const total_weeks = Number(formData.get("total_weeks") || 11);
  const starts_on = String(formData.get("starts_on") || "");
  const ends_on = String(formData.get("ends_on") || "");

  if (!academic_year || !semester) {
    throw new Error("Tahun ajaran dan semester wajib diisi.");
  }

  if (!Number.isInteger(total_weeks) || total_weeks < 1) {
    throw new Error("Jumlah minggu minimal 1.");
  }

  if (starts_on && ends_on && starts_on > ends_on) {
    throw new Error("Tanggal mulai tidak boleh melewati tanggal selesai.");
  }

  const { error } = await supabase.from("academic_periods").insert({
    academic_year,
    semester,
    total_weeks,
    starts_on: starts_on || null,
    ends_on: ends_on || null,
    is_active: false,
  });

  if (error) throw new Error(error.message);

  refreshPages();
  redirect("/dashboard/periods?success=created");
}

export async function updatePeriod(formData: FormData) {
  const supabase = await checkAdmin();

  const id = String(formData.get("id") || "");
  const academic_year = String(formData.get("academic_year") || "").trim();
  const semester = String(formData.get("semester") || "").trim();
  const total_weeks = Number(formData.get("total_weeks") || 11);
  const starts_on = String(formData.get("starts_on") || "");
  const ends_on = String(formData.get("ends_on") || "");

  if (!id || !academic_year || !semester) {
    throw new Error("Data periode belum lengkap.");
  }

  if (!Number.isInteger(total_weeks) || total_weeks < 1) {
    throw new Error("Jumlah minggu minimal 1.");
  }

  if (starts_on && ends_on && starts_on > ends_on) {
    throw new Error("Tanggal mulai tidak boleh melewati tanggal selesai.");
  }

  const { error } = await supabase
    .from("academic_periods")
    .update({
      academic_year,
      semester,
      total_weeks,
      starts_on: starts_on || null,
      ends_on: ends_on || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  refreshPages();
  redirect("/dashboard/periods?success=updated");
}

export async function activatePeriod(formData: FormData) {
  const supabase = await checkAdmin();

  const id = String(formData.get("id") || "");

  if (!id) throw new Error("ID periode tidak ditemukan.");

  // Nonaktifkan seluruh periode terlebih dahulu.
  const { error: deactivateError } = await supabase
    .from("academic_periods")
    .update({ is_active: false })
    .eq("is_active", true);

  if (deactivateError) throw new Error(deactivateError.message);

  const { error } = await supabase
    .from("academic_periods")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw new Error(error.message);

  refreshPages();
  redirect("/dashboard/periods?success=activated");
}

export async function deletePeriod(formData: FormData) {
  const supabase = await checkAdmin();

  const id = String(formData.get("id") || "");

  if (!id) throw new Error("ID periode tidak ditemukan.");

  const { error } = await supabase
    .from("academic_periods")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  refreshPages();
  redirect("/dashboard/periods?success=deleted");
}
