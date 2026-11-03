import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PendingApprovalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, approval_status")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  // Akun yang sudah disetujui langsung diarahkan ke dashboard sesuai role.
  if (profile.approval_status === "approved") {
    if (profile.role === "parent") redirect("/parent");
    if (profile.role === "teacher") redirect("/teacher");
    if (profile.role === "admin") redirect("/dashboard");

    redirect("/login");
  }

  // Hanya Parent dan Teacher yang menggunakan halaman ini.
  if (!["parent", "teacher"].includes(profile.role)) {
    redirect("/login");
  }

  const isRejected = profile.approval_status === "rejected";
  const isPending = profile.approval_status === "pending";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-bold ${
            isRejected
              ? "bg-red-100 text-red-600"
              : "bg-amber-100 text-amber-600"
          }`}
        >
          {isRejected ? "!" : "…"}
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-800">
          {isRejected
            ? "Pendaftaran belum disetujui"
            : isPending
              ? "Menunggu persetujuan"
              : "Status akun belum tersedia"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Halo, <strong>{profile.full_name || "Pengguna"}</strong>.
        </p>

        {isPending && (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Akun Anda berhasil didaftarkan dan sedang menunggu verifikasi
            dari Admin. Anda dapat mengakses dashboard setelah akun
            disetujui.
          </p>
        )}

        {isRejected && (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Mohon hubungi administrator untuk mendapatkan informasi lebih
            lanjut mengenai status pendaftaran akun Anda.
          </p>
        )}

        {!isPending && !isRejected && (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Status akun Anda belum dikenali. Silakan hubungi administrator.
          </p>
        )}

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="mt-7 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Keluar
          </button>
        </form>

        <p className="mt-5 text-xs text-slate-400">
          Student Progress Report
        </p>
      </div>
    </main>
  );
}