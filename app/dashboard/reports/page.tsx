import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  saveReportSummary,
  generateReportPdf,
} from "./actions";
import ReportNotifications from "@/app/components/ReportNotifications";
import PublishReportButton from "./PublishReportButton";

type PageProps = {
  searchParams: Promise<{
    report_id?: string;
    saved?: string;
    generated?: string;
    published?: string;
    error?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: PageProps) {
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

  if (!profile || !["admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: period } = await supabase
    .from("academic_periods")
    .select("id, academic_year, semester")
    .eq("is_active", true)
    .maybeSingle();

  let reports: any[] = [];

  if (period) {
    const { data } = await supabase
      .from("student_reports")
      .select("id, student_id, status, instructor_name, report_date, pdf_is_current")
      .eq("academic_period_id", period.id)
      .order("report_date", { ascending: false });

    reports = data || [];
  }

  const studentIds = [...new Set(reports.map((item) => item.student_id))];

  let students: any[] = [];

  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("students")
      .select("id, full_name, student_code")
      .in("id", studentIds);

    students = data || [];
  }

  const studentMap = Object.fromEntries(
    students.map((student) => [student.id, student.full_name])
  );

  const selectedReportId =
    params.report_id &&
    reports.some((item) => item.id === params.report_id)
      ? params.report_id
      : reports[0]?.id || "";

  const selectedReport = reports.find(
    (item) => item.id === selectedReportId
  );

  const { data: components } = await supabase
    .from("assessment_components")
    .select("id, code, name, weight")
    .in("code", ["CL1", "CL2", "CL3"]);

  const componentList = components || [];

  let summaries: any[] = [];

  if (selectedReportId) {
    const { data } = await supabase
      .from("report_summaries")
      .select("component_id, average_score, final_description")
      .eq("report_id", selectedReportId);

    summaries = data || [];
  }

  let weeklyIds: string[] = [];

  if (selectedReportId) {
    const { data } = await supabase
      .from("weekly_assessments")
      .select("id")
      .eq("report_id", selectedReportId);

    weeklyIds = (data || []).map((item) => item.id);
  }

  let scores: any[] = [];

  if (weeklyIds.length > 0) {
    const { data } = await supabase
      .from("weekly_assessment_scores")
      .select("component_id, score")
      .in("weekly_assessment_id", weeklyIds);

    scores = data || [];
  }

  let latestPdf: { version: number } | null = null;

  if (selectedReportId) {
    const { data } = await supabase
      .from("generated_reports")
      .select("version")
      .eq("report_id", selectedReportId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    latestPdf = data;
  }

  const getAverage = (componentId: string) => {
    const values = scores
      .filter(
        (item) =>
          item.component_id === componentId &&
          item.score !== null
      )
      .map((item) => Number(item.score));

    if (values.length === 0) return null;

    return (
      values.reduce((total, value) => total + value, 0) /
      values.length
    );
  };

  const getDescription = (componentId: string) =>
    summaries.find((item) => item.component_id === componentId)
      ?.final_description || "";

  return (
    <main className="space-y-6 p-6 md:p-8">
      <ReportNotifications
        reportId={params.report_id}
        saved={params.saved}
        generated={params.generated}
        published={params.published}
        error={params.error}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rekap Nilai & Laporan
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola rata-rata nilai dan deskripsi akhir perkembangan siswa.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Kembali ke Dashboard
        </Link>
      </div>

      {!period ? (
        <div className="rounded-xl border bg-white p-6">
          Belum ada periode akademik aktif.
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">
            Belum ada laporan siswa
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Isi penilaian mingguan terlebih dahulu. Laporan siswa akan
            dibuat otomatis ketika penilaian pertama disimpan.
          </p>
          <Link
            href="/dashboard/assessments"
            className="mt-4 inline-block text-sm font-semibold text-blue-600"
          >
            Buka Penilaian Mingguan →
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-xl border bg-white p-6">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900">Pilih Siswa</h2>
              <p className="mt-1 text-sm text-gray-500">
                Periode: {period.academic_year} — {period.semester}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports?report_id=${report.id}`}
                  className={`rounded-lg border px-4 py-2 text-sm transition ${
                    selectedReportId === report.id
                      ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {studentMap[report.student_id] || "Siswa"}

                  {report.status === "published" && (
                    <span className="ml-2 text-xs text-green-600">
                      Published
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {selectedReport && (
            <>
              <form action={saveReportSummary} className="space-y-6">
                <input
                  type="hidden"
                  name="report_id"
                  value={selectedReport.id}
                />

                <section className="rounded-xl border bg-white p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {studentMap[selectedReport.student_id] || "Siswa"}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Rekap hasil penilaian mingguan
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        selectedReport.status === "published"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {selectedReport.status === "published"
                        ? "Published"
                        : "Draft"}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {["CL1", "CL2", "CL3"].map((code) => {
                      const component = componentList.find(
                        (item) => item.code === code
                      );

                      if (!component) return null;

                      const average = getAverage(component.id);

                      return (
                        <div key={code} className="rounded-xl border p-5">
                          <p className="text-sm font-semibold text-gray-500">
                            {component.code} — {component.name}
                          </p>

                          <p className="mt-3 text-3xl font-bold text-gray-900">
                            {average === null ? "-" : average.toFixed(2)}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Rata-rata nilai mingguan
                          </p>

                          <p className="mt-3 text-xs text-gray-500">
                            Bobot: {component.weight}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border bg-white p-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Deskripsi Akhir Kompetensi
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Isi deskripsi perkembangan siswa berdasarkan hasil
                      pengamatan selama periode pembelajaran.
                    </p>
                  </div>

                  {[
                    {
                      code: "CL1",
                      name: "Adab",
                      placeholder:
                        "Tuliskan perkembangan sikap, adab, dan kebiasaan siswa...",
                    },
                    {
                      code: "CL2",
                      name: "Cognitive",
                      placeholder:
                        "Tuliskan perkembangan pemahaman dan kemampuan kognitif siswa...",
                    },
                    {
                      code: "CL3",
                      name: "Psychomotor",
                      placeholder:
                        "Tuliskan perkembangan keterampilan dan kemampuan praktik siswa...",
                    },
                  ].map((item) => {
                    const component = componentList.find(
                      (component) => component.code === item.code
                    );

                    if (!component) return null;

                    return (
                      <div key={item.code}>
                        <label className="mb-2 block text-sm font-semibold text-gray-800">
                          {item.code} — {item.name}
                        </label>

                        <textarea
                          name={`${item.code}_description`}
                          rows={4}
                          defaultValue={getDescription(component.id)}
                          placeholder={item.placeholder}
                          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                    <p className="text-xs text-gray-500">
                      Rata-rata dihitung otomatis dari nilai yang tersedia.
                    </p>

                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Simpan Rekap
                    </button>
                  </div>
                </section>
              </form>

              <section className="rounded-xl border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Generate Laporan PDF
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Buat PDF berdasarkan nilai mingguan dan deskripsi
                      akhir yang sudah tersimpan.
                    </p>

                    {latestPdf && (
                      <p className="mt-2 text-xs font-medium text-green-700">
                        PDF terakhir: versi v{latestPdf.version}
                      </p>
                    )}

                    {latestPdf && !selectedReport.pdf_is_current && (
                      <p className="mt-2 text-xs text-amber-700">
                        PDF terakhir belum mencerminkan perubahan data.
                      </p>
                    )}
                  </div>

                  <form action={generateReportPdf}>
                    <input
                      type="hidden"
                      name="report_id"
                      value={selectedReport.id}
                    />

                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Generate PDF
                    </button>
                  </form>
                </div>
              </section>

              <section className="rounded-xl border border-green-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Publikasi Laporan
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Publikasikan laporan agar wali murid dapat melihat
                      dan mengunduh PDF.
                    </p>

                    {!latestPdf && (
                      <p className="mt-2 text-xs text-amber-700">
                        Buat PDF terlebih dahulu sebelum publikasi.
                      </p>
                    )}

                    {latestPdf && !selectedReport.pdf_is_current && (
                      <p className="mt-2 text-xs text-amber-700">
                        PDF perlu dibuat ulang karena ada perubahan data.
                      </p>
                    )}

                    {selectedReport.status === "published" && (
                      <p className="mt-2 text-xs text-green-700">
                        Laporan ini sudah dipublikasikan.
                      </p>
                    )}
                  </div>

                  <PublishReportButton
                    reportId={selectedReport.id}
                    disabled={!latestPdf || !selectedReport.pdf_is_current}
                    published={selectedReport.status === "published"}
                  />
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}