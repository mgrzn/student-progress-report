
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PortalSidebar from "@/app/components/PortalSidebar";

export default async function TeacherDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "parent") redirect("/parent");
  if (profile.role === "admin") redirect("/dashboard");
  if (profile.role !== "teacher") redirect("/login");

  const [
    { count: studentCount },
    { count: reportCount },
    { count: publishedCount },
    { count: draftCount },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("student_reports").select("*", { count: "exact", head: true }),
    supabase
      .from("student_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("student_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
  ]);

  const menus = [
    {
      title: "Data Siswa",
      description: "Lihat dan kelola data seluruh siswa.",
      href: "/dashboard/students",
      icon: "👨‍🎓",
    },
    {
      title: "Penilaian Mingguan",
      description: "Input dan kelola penilaian perkembangan siswa.",
      href: "/dashboard/assessments",
      icon: "📝",
    },
    {
      title: "Laporan Perkembangan",
      description: "Kelola deskripsi dan buat PDF laporan siswa.",
      href: "/dashboard/reports",
      icon: "📊",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <PortalSidebar
        fullName={profile.full_name || "Guru"}
        role="teacher"
      />

      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 sm:px-6 md:ml-64 md:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section>
            <p className="text-sm font-medium text-blue-600">
              Teacher Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Selamat datang, {profile.full_name || "Guru"}!
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Kelola penilaian dan laporan perkembangan siswa melalui
              dashboard ini.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Siswa" value={studentCount ?? 0} />
            <StatCard title="Total Laporan" value={reportCount ?? 0} />
            <StatCard title="Laporan Terbit" value={publishedCount ?? 0} />
            <StatCard title="Laporan Draft" value={draftCount ?? 0} />
          </section>

          <section>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Menu Pengelolaan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pilih menu untuk mulai bekerja.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {menus.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md sm:p-6"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {menu.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600">
                    {menu.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {menu.description}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-blue-600">
                    Buka menu →
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">
              Informasi
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pastikan penilaian mingguan dan catatan perkembangan siswa
              selalu diperbarui. Setelah deskripsi akhir selesai, laporan
              dapat dibuat dalam bentuk PDF dan diterbitkan agar dapat
              diakses oleh wali murid.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
