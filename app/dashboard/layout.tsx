import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  // Parent harus memiliki akun yang sudah disetujui.
  if (profile.role === "parent") {
    if (profile.approval_status !== "approved") {
      redirect("/pending-approval");
    }

    redirect("/parent");
  }

  // Teacher harus sudah disetujui Admin.
  if (profile.role === "teacher") {
    if (profile.approval_status !== "approved") {
      redirect("/pending-approval");
    }

    return <>{children}</>;
  }

  // Admin dapat mengakses seluruh dashboard.
  if (profile.role === "admin") {
    return <>{children}</>;
  }

  redirect("/login");
}