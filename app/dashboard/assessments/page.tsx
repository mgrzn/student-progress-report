import AssessmentNotifications from "./AssessmentNotifications";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { saveAssessment } from "./actions";

type PageProps = {
  searchParams: Promise<{
    student_id?: string;
    week?: string;
    month?: string;
    saved?: string;
    error?: string;
  }>;
};

const months = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

function getMonthName(monthNumber: number | null) {
  return months.find((month) => month.value === monthNumber)?.label || "-";
}

export default async function AssessmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8">Silakan login terlebih dahulu.</div>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "teacher"].includes(profile.role)) {
    return <div className="p-8">Lu tidak memiliki akses ke halaman ini.</div>;
  }

  const { data: period } = await supabase
    .from("academic_periods")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code")
    .order("full_name");

  const studentList = students || [];
  const selectedStudentId =
    params.student_id || studentList[0]?.id || "";

  const parsedMonth = Number(params.month);
  const selectedMonth =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : 1;

  const parsedWeek = Number(params.week);
  const selectedWeek =
    Number.isInteger(parsedWeek) && parsedWeek >= 1 && parsedWeek <= 4
      ? parsedWeek
      : 1;

  const { data: components } = await supabase
    .from("assessment_components")
    .select("id, code, name, weight")
    .in("code", ["CL1", "CL2", "CL3"]);

  const componentList = components || [];

  let reportList: any[] = [];

  if (period) {
    const { data } = await supabase
      .from("student_reports")
      .select("id, student_id")
      .eq("academic_period_id", period.id);

    reportList = data || [];
  }

  const reportIds = reportList.map((report) => report.id);

  let weeklyList: any[] = [];

  if (reportIds.length > 0) {
    const { data } = await supabase
      .from("weekly_assessments")
      .select(
        "id, report_id, week_number, month_number, progress_note"
      )
      .in("report_id", reportIds)
      .order("month_number", { ascending: true })
      .order("week_number", { ascending: true });

    weeklyList = data || [];
  }

  const weeklyIds = weeklyList.map((item) => item.id);

  let scoreList: any[] = [];

  if (weeklyIds.length > 0) {
    const { data } = await supabase
      .from("weekly_assessment_scores")
      .select("weekly_assessment_id, component_id, score")
      .in("weekly_assessment_id", weeklyIds);

    scoreList = data || [];
  }

  const report = reportList.find(
    (item) => item.student_id === selectedStudentId
  );

  const selectedAssessment = weeklyList.find(
    (item) =>
      item.report_id === report?.id &&
      item.week_number === selectedWeek &&
      item.month_number === selectedMonth
  );

  const getScore = (componentCode: string) => {
    const component = componentList.find(
      (item) => item.code === componentCode
    );

    if (!component || !selectedAssessment) return "";

    const score = scoreList.find(
      (item) =>
        item.weekly_assessment_id === selectedAssessment.id &&
        item.component_id === component.id
    );

    return score?.score ?? "";
  };

  const studentMap = Object.fromEntries(
    studentList.map((student) => [student.id, student.full_name])
  );

  const reportMap = Object.fromEntries(
    reportList.map((item) => [item.id, item.student_id])
  );

  const getListScore = (weeklyId: string, code: string) => {
    const component = componentList.find((item) => item.code === code);
    if (!component) return "-";

    const score = scoreList.find(
      (item) =>
        item.weekly_assessment_id === weeklyId &&
        item.component_id === component.id
    );

    return score?.score ?? "-";
  };

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Penilaian Mingguan
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Input dan kelola perkembangan siswa setiap minggu.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Kembali ke Dashboard
        </Link>
      </div>
      <AssessmentNotifications
        saved={params.saved}
        error={params.error}
      />

      {!period ? (
        <div className="rounded-xl border bg-white p-6">
          <p className="font-medium text-gray-800">
            Belum ada periode akademik aktif.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Aktifkan periode akademik terlebih dahulu sebelum mengisi
            penilaian.
          </p>
          <Link
            href="/dashboard/periods"
            className="mt-4 inline-block text-sm font-semibold text-blue-600"
          >
            Kelola Periode Akademik →
          </Link>
        </div>
      ) : studentList.length === 0 ? (
        <div className="rounded-xl border bg-white p-6">
          Belum ada data siswa. Tambahkan siswa terlebih dahulu.
        </div>
      ) : (
        <>
          <section className="rounded-xl border bg-white p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Form Penilaian
              </h2>
              <p className="text-sm text-gray-500">
                Periode: {period.academic_year} — {period.semester}
              </p>
            </div>

            <form action={saveAssessment} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Nama Siswa
                  </label>
                  <select
                    name="student_id"
                    defaultValue={selectedStudentId}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  >
                    {studentList.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                        {student.student_code
                          ? ` (${student.student_code})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    Untuk mengganti siswa, pilih nama yang diinginkan.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Bulan
                  </label>
                  <select
                    name="month_number"
                    defaultValue={selectedMonth}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Minggu Ke-
                  </label>
                  <select
                    name="week_number"
                    defaultValue={selectedWeek}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  >
                    {[1, 2, 3, 4].map((week) => (
                      <option key={week} value={week}>
                        Minggu {week}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-gray-800">
                  Nilai Kompetensi
                </h3>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { code: "CL1", name: "Adab", weight: "40%" },
                    { code: "CL2", name: "Cognitive", weight: "30%" },
                    { code: "CL3", name: "Psychomotor", weight: "30%" },
                  ].map((item) => (
                    <div key={item.code} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.code}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.name}
                          </p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                          {item.weight}
                        </span>
                      </div>

                      <input
                        type="number"
                        name={item.code}
                        min="0"
                        max="100"
                        step="0.01"
                        defaultValue={getScore(item.code)}
                        placeholder="0 - 100"
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Catatan Perkembangan
                </label>
                <textarea
                  name="progress_note"
                  rows={4}
                  defaultValue={selectedAssessment?.progress_note || ""}
                  placeholder="Tuliskan perkembangan, pencapaian, atau hal yang perlu ditingkatkan oleh siswa..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <p className="text-xs text-gray-500">
                  Nilai harus berada pada rentang 0–100.
                </p>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Simpan Penilaian
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="border-b p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Riwayat Penilaian
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Penilaian yang sudah tersimpan pada periode aktif.
              </p>
            </div>

            {weeklyList.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                Belum ada penilaian yang tersimpan.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-5 py-3">Siswa</th>
                      <th className="px-5 py-3">Bulan</th>
                      <th className="px-5 py-3">Minggu</th>
                      <th className="px-5 py-3">CL1</th>
                      <th className="px-5 py-3">CL2</th>
                      <th className="px-5 py-3">CL3</th>
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {weeklyList.map((weekly) => {
                      const studentId = reportMap[weekly.report_id];

                      return (
                        <tr key={weekly.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-800">
                            {studentMap[studentId] || "Siswa"}
                          </td>
                          <td className="px-5 py-3">
                            {getMonthName(weekly.month_number)}
                          </td>
                          <td className="px-5 py-3">
                            Minggu {weekly.week_number}
                          </td>
                          <td className="px-5 py-3">
                            {getListScore(weekly.id, "CL1")}
                          </td>
                          <td className="px-5 py-3">
                            {getListScore(weekly.id, "CL2")}
                          </td>
                          <td className="px-5 py-3">
                            {getListScore(weekly.id, "CL3")}
                          </td>
                          <td className="px-5 py-3">
                            <Link
                              href={`/dashboard/assessments?student_id=${studentId}&month=${weekly.month_number ?? 1}&week=${weekly.week_number}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
