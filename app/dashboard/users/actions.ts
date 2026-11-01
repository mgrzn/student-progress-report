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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
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

// Membuat akun Guru atau Wali Murid.
export async function createUserAccount(formData: FormData) {
  await checkAdmin();

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");

  if (!fullName || !email || !password || !role) {
    redirect("/dashboard/users?error=Semua%20field%20wajib%20diisi");
  }

  if (password.length < 8) {
    redirect("/dashboard/users?error=Password%20minimal%208%20karakter");
  }

  if (!["teacher", "parent"].includes(role)) {
    redirect("/dashboard/users?error=Role%20tidak%20valid");
  }

  const adminClient = getAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error || !data.user) {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(
        error?.message || "Gagal membuat akun"
      )}`
    );
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        full_name: fullName,
        role,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    await adminClient.auth.admin.deleteUser(data.user.id);

    redirect(
      `/dashboard/users?error=${encodeURIComponent(
        `Gagal menyimpan profil: ${profileError.message}`
      )}`
    );
  }

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users?created=1");
}

// Menghubungkan akun wali murid dengan siswa.
export async function assignParentStudent(formData: FormData) {
  await checkAdmin();

  const parentId = String(formData.get("parent_id") || "");
  const studentId = String(formData.get("student_id") || "");
  const relationship = String(formData.get("relationship") || "");

  if (!parentId || !studentId || !relationship) {
    redirect("/dashboard/users?error=Semua%20data%20relasi%20wajib%20diisi");
  }

  if (!["Ayah", "Ibu", "Wali"].includes(relationship)) {
    redirect("/dashboard/users?error=Hubungan%20tidak%20valid");
  }

  const adminClient = getAdminClient();

  // Pastikan akun yang dipilih benar-benar wali murid.
  const { data: parent, error: parentError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", parentId)
    .eq("role", "parent")
    .maybeSingle();

  if (parentError || !parent) {
    redirect("/dashboard/users?error=Akun%20wali%20murid%20tidak%20valid");
  }

  // Pastikan siswa tersedia.
  const { data: student, error: studentError } = await adminClient
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    redirect("/dashboard/users?error=Data%20siswa%20tidak%20ditemukan");
  }

  // Cek apakah relasi sudah tersedia.
  const { data: existing, error: existingError } = await adminClient
    .from("parent_students")
    .select("parent_id, student_id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingError) {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(existingError.message)}`
    );
  }

  let saveError;

  if (existing) {
    // Jika sudah ada, cukup perbarui hubungan.
    const result = await adminClient
      .from("parent_students")
      .update({ relationship })
      .eq("parent_id", parentId)
      .eq("student_id", studentId);

    saveError = result.error;
  } else {
    const result = await adminClient
      .from("parent_students")
      .insert({
        parent_id: parentId,
        student_id: studentId,
        relationship,
      });

    saveError = result.error;
  }

  if (saveError) {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(saveError.message)}`
    );
  }

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users?linked=1");
}

// Menghapus relasi wali murid dan siswa.
export async function removeParentStudent(formData: FormData) {
  await checkAdmin();

  const parentId = String(formData.get("parent_id") || "");
  const studentId = String(formData.get("student_id") || "");

  if (!parentId || !studentId) {
    redirect("/dashboard/users?error=Data%20relasi%20tidak%20valid");
  }

  const adminClient = getAdminClient();

  const { error } = await adminClient
    .from("parent_students")
    .delete()
    .eq("parent_id", parentId)
    .eq("student_id", studentId);

  if (error) {
    redirect(
      `/dashboard/users?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users?unlinked=1");
}