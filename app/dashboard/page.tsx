
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  CalendarDays,
  ClipboardList,
  FileText,
  UserRound,
  ArrowUpRight,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "./sidebar";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Cek autentikasi
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Ambil profil pengguna
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  // Redirect berdasarkan role
  if (profile.role === "parent") {
    redirect("/parent");
  }

  if (profile.role === "teacher") {
    redirect("/teacher");
  }

  if (profile.role !== "admin") {
    redirect("/login");
  }

  const fullName = profile.full_name || "Administrator";

  // Ambil statistik dashboard
  const [
    studentsResult,
    usersResult,
    classesResult,
    periodsResult,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("classes")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("academic_periods")
      .select("*", { count: "exact", head: true }),
  ]);

  const studentCount = studentsResult.count ?? 0;
  const userCount = usersResult.count ?? 0;
  const classCount = classesResult.count ?? 0;
  const periodCount = periodsResult.count ?? 0;

  // Statistik role pengguna
  const { count: teacherCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher");

  const { count: parentCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "parent");

  // Periode akademik aktif
  const { data: activePeriod } = await supabase
    .from("academic_periods")
    .select("academic_year, semester, total_weeks, starts_on, ends_on")
    .eq("is_active", true)
    .maybeSingle();

  const statistics = [
    {
      title: "Total Siswa",
      value: studentCount,
      description: "Data siswa terdaftar",
      icon: GraduationCap,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Total Pengguna",
      value: userCount,
      description: `${teacherCount ?? 0} guru · ${parentCount ?? 0} wali murid`,
      icon: Users,
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Total Kelas",
      value: classCount,
      description: "Kelas yang tersedia",
      icon: School,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Periode Akademik",
      value: periodCount,
      description: "Periode yang terdaftar",
      icon: CalendarDays,
      color: "bg-orange-100 text-orange-600",
    },
  ];

  const menuItems = [
    {
      title: "Manajemen Akun",
      description: "Kelola akun guru dan wali murid.",
      href: "/dashboard/users",
      icon: Users,
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Data Siswa",
      description: "Tambah dan kelola data siswa.",
      href: "/dashboard/students",
      icon: GraduationCap,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Data Kelas",
      description: "Kelola kelas dan informasi kelas.",
      href: "/dashboard/classes",
      icon: School,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Periode Akademik",
      description: "Atur tahun ajaran dan semester.",
      href: "/dashboard/periods",
      icon: CalendarDays,
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Penilaian",
      description: "Kelola penilaian mingguan siswa.",
      href: "/dashboard/assessments",
      icon: ClipboardList,
      color: "bg-pink-100 text-pink-600",
    },
    {
      title: "Laporan",
      description: "Lihat dan kelola laporan perkembangan.",
      href: "/dashboard/reports",
      icon: FileText,
      color: "bg-indigo-100 text-indigo-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <DashboardSidebar fullName={fullName} />

      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 sm:px-6 md:ml-64 md:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Admin Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Selamat datang kembali, {fullName}.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm">
              <UserRound size={17} />
              <span>Administrator</span>
            </div>
          </div>

          {/* Welcome Banner */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-blue-100">
                Student Progress Report
              </p>

              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Pantau Perkembangan Siswa
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
                Kelola data siswa, penilaian mingguan, dan laporan
                perkembangan dalam satu platform terintegrasi.
              </p>
            </div>
          </section>

          {/* Statistics */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Ringkasan Data
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Informasi keseluruhan data dalam sistem.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statistics.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          {item.title}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                          {item.value}
                        </p>
                      </div>

                      <div className={`rounded-xl p-3 ${item.color}`}>
                        <Icon size={24} />
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Access */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Menu Pengelolaan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Akses fitur pengelolaan sistem dengan cepat.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`rounded-xl p-3 ${item.color}`}>
                        <Icon size={23} />
                      </div>

                      <ArrowUpRight
                        size={19}
                        className="text-slate-400 transition group-hover:text-blue-600"
                      />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-900">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Active Academic Period */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                  <CalendarDays size={23} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Periode Akademik Aktif
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Informasi periode pembelajaran saat ini.
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/periods"
                className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Kelola Periode
                <ArrowUpRight size={16} />
              </Link>
            </div>

            {activePeriod ? (
              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Tahun Akademik</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {activePeriod.academic_year}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Semester</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {activePeriod.semester}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Jumlah Minggu</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {activePeriod.total_weeks} Minggu
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                Belum ada periode akademik yang diaktifkan.
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
            Student Progress Report · Admin Panel
          </footer>

        </div>
      </main>
    </div>
  );
}
