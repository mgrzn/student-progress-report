
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

export async function createClass(formData: FormData) {
  const supabase = await checkAdmin();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) throw new Error("Nama kelas wajib diisi.");

  const { error } = await supabase.from("classes").insert({
    name,
    description: description || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/students");

  redirect("/dashboard/classes?success=created");
}

export async function updateClass(formData: FormData) {
  const supabase = await checkAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!id || !name) {
    throw new Error("ID dan nama kelas wajib diisi.");
  }

  const { error } = await supabase
    .from("classes")
    .update({
      name,
      description: description || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/students");

  redirect("/dashboard/classes?success=updated");
}

export async function deleteClass(formData: FormData) {
  const supabase = await checkAdmin();

  const id = String(formData.get("id") || "");

  if (!id) throw new Error("ID kelas tidak ditemukan.");

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/students");

  redirect("/dashboard/classes?success=deleted");
}
