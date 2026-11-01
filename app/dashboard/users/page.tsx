import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createUserAccount,
  assignParentStudent,
  removeParentStudent,
} from "./actions";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type PageProps = {
  searchParams: Promise<{
    created?: string;
    linked?: string;
    unlinked?: string;
    error?: string;
  }>;
};

export default async function UsersPage({ searchParams }: PageProps) {
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
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Konfigurasi Supabase Admin belum lengkap.");
  }

  const adminClient = createSupabaseClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Ambil seluruh akun.
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("full_name");

  if (profilesError) throw new Error(profilesError.message);

  const accountList = profiles || [];

  // Ambil email akun Auth.
  const { data: authUsers, error: authError } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (authError) throw new Error(authError.message);

  const emailMap = Object.fromEntries(
    (authUsers.users || []).map((item) => [
      item.id,
      item.email || "-",
    ])
  );

  // Daftar wali murid.
  const parents = accountList.filter(
    (account) => account.role === "parent"
  );

  // Daftar siswa.
  const { data: students, error: studentsError } = await adminClient
    .from("students")
    .select("id, full_name, student_code")
    .order("full_name");

  if (studentsError) throw new Error(studentsError.message);

  const studentList = students || [];

  // Daftar relasi wali murid dan siswa.
  const { data: relationships, error: relationshipError } =
    await adminClient
      .from("parent_students")
      .select("parent_id, student_id, relationship");

  if (relationshipError) {
    throw new Error(relationshipError.message);
  }

  const relationshipList = relationships || [];

  const parentMap = Object.fromEntries(
    parents.map((parent) => [
      parent.id,
      parent.full_name || emailMap[parent.id] || "Wali Murid",
    ])
  );

  const studentMap = Object.fromEntries(
    studentList.map((student) => [
      student.id,
      student.full_name,
    ])
  );

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manajemen Akun
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola akun guru, wali murid, dan hubungan wali murid dengan siswa.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Notifikasi */}
      {params.created === "1" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Akun berhasil dibuat.
        </div>
      )}

      {params.linked === "1" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Wali murid berhasil dihubungkan dengan siswa.
        </div>
      )}

      {params.unlinked === "1" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Relasi wali murid dan siswa berhasil dihapus.
        </div>
      )}

      {params.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal: {params.error}
        </div>
      )}

      {/* Form Buat Akun */}
      <section className="rounded-xl border bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Buat Akun Baru
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Buat akun untuk guru atau wali murid.
          </p>
        </div>

        <form action={createUserAccount} className="space-y-4">
          <div>
            <label
              htmlFor="full_name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Nama Lengkap
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="Masukkan nama lengkap"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="contoh@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password Sementara
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Minimal 8 karakter"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Berikan password kepada pengguna secara aman.
            </p>
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Role Akun
            </label>
            <select
              id="role"
              name="role"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="" disabled>
                Pilih role
              </option>
              <option value="teacher">Guru</option>
              <option value="parent">Wali Murid</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Buat Akun
          </button>
        </form>
      </section>

      {/* Daftar Akun */}
      <section className="rounded-xl border bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Daftar Akun
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Total {accountList.length} akun terdaftar.
          </p>
        </div>

        {accountList.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada akun terdaftar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500">
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>

              <tbody>
                {accountList.map((account) => (
                  <tr key={account.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {account.full_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {emailMap[account.id] || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {account.role === "admin"
                          ? "Admin"
                          : account.role === "teacher"
                          ? "Guru"
                          : account.role === "parent"
                          ? "Wali Murid"
                          : account.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Form Hubungkan Wali Murid */}
      <section className="rounded-xl border bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Hubungkan Wali Murid dengan Siswa
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tentukan siswa yang dapat diakses oleh masing-masing akun wali murid.
          </p>
        </div>

        {parents.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Belum ada akun wali murid. Buat akun wali murid terlebih dahulu.
          </p>
        ) : studentList.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Belum ada data siswa. Tambahkan siswa terlebih dahulu melalui menu Data Siswa.
          </p>
        ) : (
          <form action={assignParentStudent} className="space-y-4">
            <div>
              <label
                htmlFor="parent_id"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Akun Wali Murid
              </label>
              <select
                id="parent_id"
                name="parent_id"
                required
                defaultValue=""
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Pilih wali murid
                </option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.full_name || "Tanpa nama"} —{" "}
                    {emailMap[parent.id] || "-"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="student_id"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Siswa
              </label>
              <select
                id="student_id"
                name="student_id"
                required
                defaultValue=""
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Pilih siswa
                </option>
                {studentList.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                    {student.student_code
                      ? ` (${student.student_code})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="relationship"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Hubungan dengan Siswa
              </label>
              <select
                id="relationship"
                name="relationship"
                required
                defaultValue=""
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Pilih hubungan
                </option>
                <option value="Ayah">Ayah</option>
                <option value="Ibu">Ibu</option>
                <option value="Wali">Wali</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Hubungkan Siswa
            </button>
          </form>
        )}
      </section>

      {/* Daftar Relasi */}
      <section className="rounded-xl border bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Daftar Relasi Wali Murid
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Total {relationshipList.length} relasi terdaftar.
          </p>
        </div>

        {relationshipList.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada relasi wali murid dengan siswa.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500">
                  <th className="px-4 py-3 font-medium">Wali Murid</th>
                  <th className="px-4 py-3 font-medium">Siswa</th>
                  <th className="px-4 py-3 font-medium">Hubungan</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {relationshipList.map((item) => (
                  <tr
                    key={`${item.parent_id}-${item.student_id}`}
                    className="border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {parentMap[item.parent_id] || "Akun tidak ditemukan"}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {studentMap[item.student_id] || "Siswa tidak ditemukan"}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {item.relationship || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <form action={removeParentStudent}>
                        <input
                          type="hidden"
                          name="parent_id"
                          value={item.parent_id}
                        />
                        <input
                          type="hidden"
                          name="student_id"
                          value={item.student_id}
                        />
                        <button
                          type="submit"
                          className="text-sm font-semibold text-red-600 hover:text-red-800"
                        >
                          Hapus Relasi
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}