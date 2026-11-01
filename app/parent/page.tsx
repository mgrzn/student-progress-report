
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FileText,
  Download,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import PortalSidebar from "@/app/components/PortalSidebar";

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) redirect("/login");

  const isAdmin = profile.role === "admin";
  const isParent = profile.role === "parent";

  if (!isAdmin && !isParent) redirect("/dashboard");

  // Ambil relasi wali murid.
  const { data: relationships, error: relationshipError } =
    await supabase
      .from("parent_students")
      .select("student_id, relationship")
      .eq("parent_id", user.id);

  if (relationshipError) {
    throw new Error(relationshipError.message);
  }

  let studentIds = (relationships || []).map(
    (item) => item.student_id
  );

  // Admin dapat melihat semua siswa.
  if (isAdmin) {
    const { data: allStudents, error: allStudentsError } =
      await supabase
        .from("students")
        .select("id");

    if (allStudentsError) {
      throw new Error(allStudentsError.message);
    }

    studentIds = (allStudents || []).map((item) => item.id);
  }

  let students: any[] = [];
  let reports: any[] = [];
  let summaries: any[] = [];
  let components: any[] = [];
  let periods: any[] = [];
  let generatedReports: any[] = [];
  let weeklyAssessments: any[] = [];
  let weeklyScores: any[] = [];

  if (studentIds.length > 0) {
    // Data siswa.
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, full_name, student_code, class_id")
      .in("id", studentIds)
      .order("full_name");

    if (studentError) throw new Error(studentError.message);

    students = studentData || [];

    // Laporan yang sudah dipublikasikan.
    const { data: reportData, error: reportError } = await supabase
      .from("student_reports")
      .select(
        "id, student_id, academic_period_id, instructor_name, report_date, status"
      )
      .in("student_id", studentIds)
      .eq("status", "published")
      .order("report_date", { ascending: false });

    if (reportError) throw new Error(reportError.message);

    reports = reportData || [];

    const reportIds = reports.map((report) => report.id);

    const periodIds = [
      ...new Set(
        reports.map((report) => report.academic_period_id)
      ),
    ];

    if (reportIds.length > 0) {
      // Ringkasan deskripsi CL1, CL2, CL3.
      const { data: summaryData, error: summaryError } = await supabase
        .from("report_summaries")
        .select("id, report_id, component_id, final_description")
        .in("report_id", reportIds);

      if (summaryError) throw new Error(summaryError.message);

      summaries = summaryData || [];

      // Ambil penilaian mingguan.
      const { data: weeklyData, error: weeklyError } = await supabase
        .from("weekly_assessments")
        .select("id, report_id, week_number")
        .in("report_id", reportIds);

      if (weeklyError) throw new Error(weeklyError.message);

      weeklyAssessments = weeklyData || [];

      const weeklyIds = weeklyAssessments.map((item) => item.id);

      // Ambil nilai setiap komponen.
      if (weeklyIds.length > 0) {
        const { data: scoreData, error: scoreError } = await supabase
          .from("weekly_assessment_scores")
          .select("weekly_assessment_id, component_id, score")
          .in("weekly_assessment_id", weeklyIds);

        if (scoreError) throw new Error(scoreError.message);

        weeklyScores = scoreData || [];
      }

      // Versi PDF.
      const { data: generatedData, error: generatedError } =
        await supabase
          .from("generated_reports")
          .select("id, report_id, version, storage_path, created_at")
          .in("report_id", reportIds)
          .order("version", { ascending: false });

      if (generatedError) throw new Error(generatedError.message);

      generatedReports = generatedData || [];
    }

    // Periode akademik.
    if (periodIds.length > 0) {
      const { data: periodData, error: periodError } = await supabase
        .from("academic_periods")
        .select("id, academic_year, semester")
        .in("id", periodIds);

      if (periodError) throw new Error(periodError.message);

      periods = periodData || [];
    }

    // Komponen penilaian.
    const { data: componentData, error: componentError } =
      await supabase
        .from("assessment_components")
        .select("id, code, name")
        .order("code");

    if (componentError) throw new Error(componentError.message);

    components = componentData || [];
  }

  // Mapping hubungan wali murid.
  const relationshipMap = Object.fromEntries(
    (relationships || []).map((item) => [
      item.student_id,
      item.relationship,
    ])
  );

  // Mapping periode akademik.
  const periodMap = Object.fromEntries(
    periods.map((period) => [
      period.id,
      `${period.academic_year} - ${period.semester}`,
    ])
  );

  // Ambil PDF versi terbaru setiap laporan.
  const latestReportMap = new Map<string, any>();

  for (const generated of generatedReports) {
    if (!latestReportMap.has(generated.report_id)) {
      latestReportMap.set(generated.report_id, generated);
    }
  }

  // Buat signed URL PDF.
  const pdfUrlMap: Record<string, string> = {};

  await Promise.all(
    Array.from(latestReportMap.entries()).map(
      async ([reportId, generated]) => {
        const { data, error } = await supabase.storage
          .from("reports")
          .createSignedUrl(generated.storage_path, 60 * 60);

        if (!error && data?.signedUrl) {
          pdfUrlMap[reportId] = data.signedUrl;
        }
      }
    )
  );

  // Kelompokkan laporan berdasarkan siswa.
  const reportsByStudent = students.map((student) => ({
    student,
    reports: reports.filter(
      (report) => report.student_id === student.id
    ),
  }));

  // Hitung rata-rata berdasarkan nilai mingguan.
  function calculateAverage(reportId: string, componentId: string) {
    const reportWeeklyIds = weeklyAssessments
      .filter((item) => item.report_id === reportId)
      .map((item) => item.id);

    const values = weeklyScores
      .filter(
        (item) =>
          reportWeeklyIds.includes(item.weekly_assessment_id) &&
          item.component_id === componentId &&
          item.score !== null
      )
      .map((item) => Number(item.score));

    if (values.length === 0) return null;

    const average =
      values.reduce((total, value) => total + value, 0) /
      values.length;

    return Number(average.toFixed(2));
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <PortalSidebar
        fullName={profile.full_name || "Wali Murid"}
        role="parent"
      />

      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 sm:px-6 md:ml-64 md:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl space-y-7 sm:space-y-8">
          {/* Sambutan */}
          <section>
            <p className="text-sm font-medium text-blue-600">
              {isAdmin ? "Admin Preview" : "Parent Dashboard"}
            </p>

            <h1 className="mt-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">
              Halo, {profile.full_name || (isAdmin ? "Admin" : "Wali Murid")}!
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
              {isAdmin
                ? "Anda sedang melihat dashboard laporan dari sisi administrator."
                : "Pantau perkembangan belajar dan unduh laporan perkembangan anak Anda."}
            </p>
          </section>

          {/* Statistik */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600">
                  <GraduationCap size={22} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    {isAdmin ? "Total Siswa" : "Anak Terhubung"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {students.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-green-50 p-3 text-green-600">
                  <FileText size={22} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">Laporan Terbit</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {reports.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Daftar Siswa dan Laporan */}
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                {isAdmin
                  ? "Seluruh Laporan Siswa"
                  : "Laporan Perkembangan Anak"}
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Laporan yang sudah dipublikasikan dapat dilihat dan diunduh di sini.
              </p>
            </div>

            {students.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
                <GraduationCap
                  size={36}
                  className="mx-auto mb-3 text-slate-300"
                />

                <h3 className="font-semibold text-slate-800">
                  {isAdmin
                    ? "Belum ada data siswa"
                    : "Belum ada siswa terhubung"}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {isAdmin
                    ? "Tambahkan data siswa melalui menu Data Siswa."
                    : "Silakan hubungi administrator untuk menghubungkan akun Anda dengan data siswa."}
                </p>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                {reportsByStudent.map(
                  ({ student, reports: studentReports }) => (
                    <article
                      key={student.id}
                      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* Identitas siswa */}
                      <div className="border-b border-slate-100 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-words text-base font-bold text-slate-900 sm:text-lg">
                              {student.full_name}
                            </h3>

                            <p className="mt-1 break-words text-xs leading-relaxed text-slate-500 sm:text-sm">
                              {student.student_code
                                ? `Kode siswa: ${student.student_code} · `
                                : ""}
                              {isAdmin
                                ? "Tampilan administrator"
                                : `Hubungan: ${relationshipMap[student.id] || "Wali"}`}
                            </p>
                          </div>

                          <span className="w-fit shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                            Siswa Terhubung
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 sm:p-5">
                        {studentReports.length === 0 ? (
                          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-500">
                            Belum ada laporan yang dipublikasikan untuk siswa ini.
                          </p>
                        ) : (
                          studentReports.map((report) => {
                            const latestPdf = latestReportMap.get(report.id);

                            const reportSummaries = summaries.filter(
                              (summary) => summary.report_id === report.id
                            );

                            return (
                              <div
                                key={report.id}
                                className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5"
                              >
                                {/* Informasi periode */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex items-start gap-2">
                                      <CalendarDays
                                        size={17}
                                        className="mt-0.5 shrink-0 text-slate-400"
                                      />

                                      <h4 className="break-words font-semibold text-slate-900">
                                        {periodMap[report.academic_period_id] ||
                                          "Periode Akademik"}
                                      </h4>
                                    </div>

                                    <p className="mt-2 text-xs text-slate-500">
                                      Pengajar: {report.instructor_name || "-"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Tanggal laporan: {report.report_date || "-"}
                                    </p>
                                  </div>

                                  <span className="w-fit shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                    Published
                                  </span>
                                </div>

                                {/* Ringkasan CL */}
                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {components
                                    .filter((component) =>
                                      ["CL1", "CL2", "CL3"].includes(
                                        component.code
                                      )
                                    )
                                    .map((component) => {
                                      const summary = reportSummaries.find(
                                        (item) =>
                                          item.component_id === component.id
                                      );

                                      const average = calculateAverage(
                                        report.id,
                                        component.id
                                      );

                                      return (
                                        <div
                                          key={component.id}
                                          className="min-w-0 rounded-xl bg-slate-50 p-4"
                                        >
                                          <p className="break-words text-xs font-semibold text-slate-500">
                                            {component.name}
                                          </p>

                                          <p className="mt-1 text-2xl font-bold text-slate-900">
                                            {average !== null
                                              ? average.toFixed(1)
                                              : "-"}
                                          </p>

                                          <p className="mt-2 break-words text-xs leading-relaxed text-slate-600">
                                            {summary?.final_description ||
                                              "Belum ada deskripsi."}
                                          </p>
                                        </div>
                                      );
                                    })}
                                </div>

                                {/* PDF */}
                                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      Dokumen laporan
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {latestPdf
                                        ? `Versi terbaru: v${latestPdf.version}`
                                        : "PDF belum tersedia"}
                                    </p>
                                  </div>

                                  {pdfUrlMap[report.id] ? (
                                    <a
                                      href={pdfUrlMap[report.id]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                                    >
                                      <Download size={16} />
                                      Unduh PDF
                                    </a>
                                  ) : (
                                    <span className="rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-400 sm:text-left">
                                      PDF belum tersedia
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
            Student Progress Report
          </footer>
        </div>
      </main>
    </div>
  );
}
