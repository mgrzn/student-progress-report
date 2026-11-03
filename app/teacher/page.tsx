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
  .select("full_name, role, approval_status")
  .eq("id", user.id)
  .single();

  if (!profile) redirect("/login");

  if (profile.role === "parent") {
    if (profile.approval_status !== "approved") {
      redirect("/pending-approval");
    }

    redirect("/parent");
  }

  if (profile.role === "admin") redirect("/dashboard");

  if (profile.role !== "teacher") redirect("/login");

  if (profile.approval_status !== "approved") {
    redirect("/pending-approval");
  }

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

  // Ambil seluruh laporan yang sudah dipublikasikan
  const { data: reports } = await supabase
    .from("student_reports")
    .select(
      "id, student_id, academic_period_id, report_date, status, pdf_is_current"
    )
    .eq("status", "published")
    .order("report_date", { ascending: false });

  const publishedReports = [];

  if (reports && reports.length > 0) {
    const studentIds = [...new Set(reports.map((r) => r.student_id))];
    const periodIds = [...new Set(reports.map((r) => r.academic_period_id))];
    const reportIds = reports.map((r) => r.id);

    const [
      { data: students },
      { data: periods },
      { data: generatedReports },
    ] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, class_id")
        .in("id", studentIds),

      supabase
        .from("academic_periods")
        .select("id, academic_year, semester")
        .in("id", periodIds),

      supabase
        .from("generated_reports")
        .select("id, report_id, version, storage_path, created_at")
        .in("report_id", reportIds)
        .order("created_at", { ascending: false }),
    ]);

    const classIds = [
      ...new Set(
        (students || [])
          .map((student) => student.class_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const { data: classes } =
      classIds.length > 0
        ? await supabase
            .from("classes")
            .select("id, name")
            .in("id", classIds)
        : { data: [] };

    const studentMap = new Map(
      (students || []).map((student) => [student.id, student])
    );

    const periodMap = new Map(
      (periods || []).map((period) => [period.id, period])
    );

    const classMap = new Map(
      (classes || []).map((item) => [item.id, item])
    );

    // Karena data diurutkan terbaru terlebih dahulu,
    // versi pertama untuk setiap report_id adalah versi terbaru.
    const latestPdfMap = new Map();

    for (const pdf of generatedReports || []) {
      if (!latestPdfMap.has(pdf.report_id)) {
        latestPdfMap.set(pdf.report_id, pdf);
      }
    }

    for (const report of reports) {
      const student = studentMap.get(report.student_id);
      const period = periodMap.get(report.academic_period_id);
      const pdf = latestPdfMap.get(report.id);

      if (!student || !pdf?.storage_path) continue;

      const classData = student.class_id
        ? classMap.get(student.class_id)
        : null;

      const { data: viewData } = await supabase.storage
        .from("reports")
        .createSignedUrl(pdf.storage_path, 60 * 60);

      const { data: downloadData } = await supabase.storage
        .from("reports")
        .createSignedUrl(pdf.storage_path, 60 * 60, {
          download: `${student.full_name.replace(/[^a-zA-Z0-9-_]/g, "_")}_Laporan.pdf`,
        });

      publishedReports.push({
        id: report.id,
        studentName: student.full_name,
        className: classData?.name || "Belum ada kelas",
        academicYear: period?.academic_year || "-",
        semester: period?.semester || "-",
        reportDate: report.report_date,
        version: pdf.version,
        viewUrl: viewData?.signedUrl || null,
        downloadUrl: downloadData?.signedUrl || null,
      });
    }
  }

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

          {/* PDF Laporan Terpublikasi */}
          <section>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                PDF Laporan Terpublikasi
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lihat dan unduh laporan siswa yang sudah diterbitkan.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {publishedReports.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mb-3 text-4xl">📄</div>
                  <h3 className="font-semibold text-slate-800">
                    Belum ada PDF terpublikasi
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    PDF laporan yang sudah diterbitkan akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {publishedReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-2xl">
                          📄
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900">
                            {report.studentName}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {report.className}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Tahun Ajaran: {report.academicYear} · Semester:{" "}
                            {report.semester}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Published
                            </span>

                            <span className="text-xs text-slate-400">
                              PDF versi {report.version}
                            </span>

                            {report.reportDate && (
                              <span className="text-xs text-slate-400">
                                ·{" "}
                                {new Date(
                                  `${report.reportDate}T00:00:00`
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {report.viewUrl && (
                          <a
                            href={report.viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            Lihat PDF
                          </a>
                        )}

                        {report.downloadUrl && (
                          <a
                            href={report.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                          >
                            Unduh
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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