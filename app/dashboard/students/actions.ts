"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkStaff() {
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

  if (!profile || !["admin", "teacher"].includes(profile.role)) {
    throw new Error("Akses hanya untuk Admin dan Guru.");
  }

  return supabase;
}

export async function createStudent(formData: FormData) {
  const supabase = await checkStaff();

  const full_name = String(formData.get("full_name") || "").trim();
  const student_code = String(formData.get("student_code") || "").trim();
  const class_id = String(formData.get("class_id") || "").trim();

  if (!full_name) {
    throw new Error("Nama siswa wajib diisi.");
  }

  const { error } = await supabase.from("students").insert({
    full_name,
    student_code: student_code || null,
    class_id: class_id || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/students");
  revalidatePath("/teacher");

  redirect("/dashboard/students?success=created");
}

export async function updateStudent(formData: FormData) {
  const supabase = await checkStaff();

  const id = String(formData.get("id") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const student_code = String(formData.get("student_code") || "").trim();
  const class_id = String(formData.get("class_id") || "").trim();

  if (!id || !full_name) {
    throw new Error("ID dan nama siswa wajib diisi.");
  }

  const { error } = await supabase
    .from("students")
    .update({
      full_name,
      student_code: student_code || null,
      class_id: class_id || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/students");
  revalidatePath("/teacher");

  redirect("/dashboard/students?success=updated");
}

export async function deleteStudent(formData: FormData) {
  const supabase = await checkStaff();

  const id = String(formData.get("id") || "");

  if (!id) {
    throw new Error("ID siswa tidak ditemukan.");
  }

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/students");
  revalidatePath("/teacher");

  redirect("/dashboard/students?success=deleted");
}