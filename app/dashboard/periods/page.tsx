
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createPeriod,
  updatePeriod,
  activatePeriod,
  deletePeriod,
} from "./actions";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";

type Period = {
  id: string;
  academic_year: string;
  semester: string;
  total_weeks: number;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

export default async function PeriodsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
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

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data, error } = await supabase
    .from("academic_periods")
    .select("*")
    .order("created_at", { ascending: false });

  if (error && error.code !== "42703") {
    throw new Error(error.message);
  }

  // Jika tabel belum memiliki created_at, urutkan berdasarkan tahun ajaran.
  let periodList = (data ?? []) as Period[];

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("academic_periods")
      .select("*")
      .order("academic_year", { ascending: false });

    if (fallback.error) throw new Error(fallback.error.message);
    periodList = (fallback.data ?? []) as Period[];
  }

  const messages: Record<string, string> = {
    created: "Periode akademik berhasil ditambahkan.",
    updated: "Periode akademik berhasil diperbarui.",
    activated: "Periode akademik berhasil diaktifkan.",
    deleted: "Periode akademik berhasil dihapus.",
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>

        <div className="mb-8">
          <p className="text-sm font-bold tracking-wider text-blue-700">
            ADMINISTRATOR
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Periode Akademik
          </h1>
          <p className="mt-2 text-slate-500">
            Atur tahun ajaran, semester, dan durasi penilaian siswa.
          </p>
        </div>

        {params.success && messages[params.success] && (
          <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {messages[params.success]}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Tambah Periode
                </h2>
                <p className="text-xs text-slate-500">
                  Buat periode akademik baru.
                </p>
              </div>
            </div>

            <form action={createPeriod} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tahun Ajaran
                </label>
                <input
                  name="academic_year"
                  required
                  placeholder="2026/2027"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Semester
                </label>
                <select
                  name="semester"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">Pilih semester</option>
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Jumlah Minggu
                </label>
                <input
                  name="total_weeks"
                  type="number"
                  min="1"
                  defaultValue={11}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tanggal Mulai
                </label>
                <input
                  name="starts_on"
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tanggal Selesai
                </label>
                <input
                  name="ends_on"
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Plus size={17} />
                Tambahkan Periode
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Daftar Periode
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total {periodList.length} periode
                </p>
              </div>
              <CalendarDays className="text-blue-700" size={25} />
            </div>

            {periodList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
                <CalendarDays
                  size={36}
                  className="mx-auto mb-3 text-slate-300"
                />
                <p className="font-medium text-slate-600">
                  Belum ada periode akademik.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {periodList.map((period) => (
                  <div
                    key={period.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {period.academic_year} - {period.semester}
                          </h3>
                          {period.is_active && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Periode Aktif
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {period.total_weeks} minggu
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {period.starts_on || "Tanggal mulai belum diatur"}
                          {" — "}
                          {period.ends_on || "Tanggal selesai belum diatur"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!period.is_active && (
                          <form action={activatePeriod}>
                            <input
                              type="hidden"
                              name="id"
                              value={period.id}
                            />
                            <button
                              type="submit"
                              className="flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle2 size={14} />
                              Aktifkan
                            </button>
                          </form>
                        )}

                        <details className="relative">
                          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                            <Pencil size={14} />
                            Edit
                          </summary>

                          <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                            <form action={updatePeriod} className="space-y-3">
                              <input
                                type="hidden"
                                name="id"
                                value={period.id}
                              />

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Tahun Ajaran
                                </label>
                                <input
                                  name="academic_year"
                                  required
                                  defaultValue={period.academic_year}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Semester
                                </label>
                                <select
                                  name="semester"
                                  defaultValue={period.semester}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                >
                                  <option value="Ganjil">Ganjil</option>
                                  <option value="Genap">Genap</option>
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Jumlah Minggu
                                </label>
                                <input
                                  name="total_weeks"
                                  type="number"
                                  min="1"
                                  required
                                  defaultValue={period.total_weeks}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Tanggal Mulai
                                </label>
                                <input
                                  name="starts_on"
                                  type="date"
                                  defaultValue={period.starts_on ?? ""}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Tanggal Selesai
                                </label>
                                <input
                                  name="ends_on"
                                  type="date"
                                  defaultValue={period.ends_on ?? ""}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                              >
                                Simpan Perubahan
                              </button>
                            </form>
                          </div>
                        </details>

                        <form action={deletePeriod}>
                          <input
                            type="hidden"
                            name="id"
                            value={period.id}
                          />
                          <button
                            type="submit"
                            className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
