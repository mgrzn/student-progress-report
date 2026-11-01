
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createClass,
  updateClass,
  deleteClass,
} from "./actions";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
} from "lucide-react";

export default async function ClassesPage({
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

  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const classList = classes ?? [];

  const successMessages: Record<string, string> = {
    created: "Kelas berhasil ditambahkan.",
    updated: "Data kelas berhasil diperbarui.",
    deleted: "Kelas berhasil dihapus.",
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
            Manajemen Kelas
          </h1>
          <p className="mt-2 text-slate-500">
            Kelola kelas yang digunakan untuk mengelompokkan siswa.
          </p>
        </div>

        {params.success && successMessages[params.success] && (
          <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
            {successMessages[params.success]}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Form tambah kelas */}
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Tambah Kelas
                </h2>
                <p className="text-xs text-slate-500">
                  Masukkan informasi kelas baru.
                </p>
              </div>
            </div>

            <form action={createClass} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nama Kelas
                </label>
                <input
                  name="name"
                  required
                  placeholder="Contoh: CL1"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Deskripsi kelas (opsional)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                <Plus size={17} />
                Tambahkan Kelas
              </button>
            </form>
          </section>

          {/* Daftar kelas */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Daftar Kelas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total {classList.length} kelas terdaftar
                </p>
              </div>
              <GraduationCap className="text-blue-700" size={25} />
            </div>

            {classList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
                <GraduationCap
                  size={36}
                  className="mx-auto mb-3 text-slate-300"
                />
                <p className="font-medium text-slate-600">
                  Belum ada kelas.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Tambahkan kelas melalui formulir di samping.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {classList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.description || "Tidak ada deskripsi."}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <details className="relative">
                          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            <Pencil size={14} />
                            Edit
                          </summary>

                          <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                            <form action={updateClass} className="space-y-3">
                              <input
                                type="hidden"
                                name="id"
                                value={item.id}
                              />

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Nama Kelas
                                </label>
                                <input
                                  name="name"
                                  required
                                  defaultValue={item.name}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Deskripsi
                                </label>
                                <textarea
                                  name="description"
                                  rows={3}
                                  defaultValue={item.description ?? ""}
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

                        <form action={deleteClass}>
                          <input
                            type="hidden"
                            name="id"
                            value={item.id}
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
