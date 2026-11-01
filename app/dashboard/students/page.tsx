import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createStudent,
  updateStudent,
  deleteStudent,
} from "./actions";
import {
  ArrowLeft,
  GraduationCap,
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";

type SearchParams = Promise<{
  success?: string;
}>;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
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

  // Admin dan Guru boleh mengakses data siswa.
  if (!profile || !["admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const isAdmin = profile.role === "admin";
  const dashboardUrl = isAdmin ? "/dashboard" : "/teacher";

  const [
    { data: students, error: studentError },
    { data: classes, error: classError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, student_code, class_id, created_at")
      .order("full_name"),
    supabase
      .from("classes")
      .select("id, name")
      .order("name"),
  ]);

  const studentList = students ?? [];
  const classList = classes ?? [];

  const classMap = new Map(
    classList.map((item) => [item.id, item.name])
  );

  const successMessages: Record<string, string> = {
    created: "Siswa berhasil ditambahkan.",
    updated: "Data siswa berhasil diperbarui.",
    deleted: "Data siswa berhasil dihapus.",
  };

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={dashboardUrl}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {isAdmin ? "ADMINISTRATION" : "TEACHER"}
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Data Siswa
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Kelola data dan informasi seluruh siswa.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold">
              {studentList.length} Siswa
            </span>
          </div>
        </div>

        {params.success && successMessages[params.success] && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMessages[params.success]}
          </div>
        )}

        {(studentError || classError) && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Gagal mengambil data:{" "}
            {studentError?.message || classError?.message}
          </div>
        )}

        {/* Form tambah siswa */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Tambah Siswa
              </h2>
              <p className="text-sm text-slate-500">
                Masukkan informasi siswa baru.
              </p>
            </div>
          </div>

          <form action={createStudent} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nama Lengkap *
              </label>

              <input
                name="full_name"
                required
                placeholder="Nama lengkap siswa"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Kode Siswa
              </label>

              <input
                name="student_code"
                placeholder="Contoh: STD001"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Kelas
              </label>

              <select
                name="class_id"
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Belum ditentukan</option>

                {classList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Simpan Siswa
              </button>
            </div>
          </form>
        </section>

        {/* Daftar siswa */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
            <div>
              <h2 className="font-bold text-slate-900">
                Daftar Siswa
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Seluruh data siswa yang terdaftar.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Search className="h-4 w-4" />
              Data dari Supabase
            </div>
          </div>

          {studentList.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />

              <h3 className="mt-4 font-semibold text-slate-800">
                Belum ada data siswa
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Gunakan form di atas untuk menambahkan siswa pertama.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Nama Siswa</th>
                    <th className="px-6 py-4">Kode Siswa</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Dibuat</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {studentList.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {student.full_name}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {student.student_code || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {student.class_id
                          ? classMap.get(student.class_id) ||
                            "Kelas tidak ditemukan"
                          : "Belum ditentukan"}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {student.created_at
                          ? new Date(student.created_at).toLocaleDateString(
                              "id-ID"
                            )
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <details className="relative">
                            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                              <Pencil className="h-3 w-3" />
                              Edit
                            </summary>

                            <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border bg-white p-4 shadow-xl">
                              <form
                                action={updateStudent}
                                className="space-y-3"
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={student.id}
                                />

                                <div>
                                  <label className="mb-1 block text-xs font-semibold">
                                    Nama Lengkap
                                  </label>

                                  <input
                                    name="full_name"
                                    required
                                    defaultValue={student.full_name}
                                    className="w-full rounded-lg border px-3 py-2 text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-semibold">
                                    Kode Siswa
                                  </label>

                                  <input
                                    name="student_code"
                                    defaultValue={student.student_code || ""}
                                    className="w-full rounded-lg border px-3 py-2 text-sm"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-semibold">
                                    Kelas
                                  </label>

                                  <select
                                    name="class_id"
                                    defaultValue={student.class_id || ""}
                                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                                  >
                                    <option value="">
                                      Belum ditentukan
                                    </option>

                                    {classList.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <button
                                  type="submit"
                                  className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                                >
                                  Simpan Perubahan
                                </button>
                              </form>
                            </div>
                          </details>

                          <form action={deleteStudent}>
                            <input
                              type="hidden"
                              name="id"
                              value={student.id}
                            />

                            <button
                              type="submit"
                              className="flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Hapus
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}