import Link from "next/link";
import {
  BookOpenCheck,
  Users,
  ChartNoAxesCombined,
  FileText,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Manajemen pengguna",
    desc: "Kelola akun admin, guru, wali murid, dan data siswa.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Penilaian mingguan",
    desc: "Catat perkembangan CL1, CL2, dan CL3 setiap minggu.",
  },
  {
    icon: FileText,
    title: "Laporan individual",
    desc: "Buat dan unduh laporan PDF untuk setiap siswa.",
  },
];

const assessments = [
  { label: "CL1 — Adab", score: 84 },
  { label: "CL2 — Kognitif", score: 78 },
  { label: "CL3 — Psikomotorik", score: 91 },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Navbar */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="rounded-xl bg-blue-700 p-2 text-white">
            <BookOpenCheck size={20} />
          </span>

          <span>
            Student<span className="text-blue-700">Progress</span>
          </span>
        </Link>

        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Masuk
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2 md:gap-12 md:py-24">
        <div>
          <p className="mb-5 inline-block rounded-full bg-blue-100 px-3 py-1.5 text-[10px] font-bold tracking-wide text-blue-800 sm:text-xs">
            PLATFORM LAPORAN PERKEMBANGAN SISWA
          </p>

          <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl md:text-5xl lg:text-6xl">
            Pantau perkembangan belajar dengan lebih{" "}
            <span className="text-blue-700">terstruktur.</span>
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
            Kelola penilaian mingguan, catatan perkembangan, dan laporan
            siswa dalam satu platform.
          </p>

          <Link
            href="/login"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:text-base"
          >
            Masuk ke aplikasi
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Preview */}
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:rounded-3xl sm:p-7">
          <p className="text-xs text-slate-500 sm:text-sm">
            Contoh ringkasan perkembangan
          </p>

          <h2 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
            Tahun Ajaran 2026/2027
          </h2>

          <div className="mt-5 space-y-5">
            {assessments.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <b className="text-gray-800">{item.label}</b>
                  <b className="shrink-0 text-blue-700">
                    {item.score}%
                  </b>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-700"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-slate-400">
            Ilustrasi — bukan data siswa sebenarnya.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Fitur utama
          </h2>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Semua kebutuhan pengelolaan laporan dalam satu tempat.
          </p>

          <div className="mt-7 grid gap-4 sm:mt-8 sm:grid-cols-2 md:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md sm:p-6"
              >
                <Icon className="text-blue-700" size={24} />

                <h3 className="mt-4 font-bold text-gray-900">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-7 text-center text-xs text-slate-500 sm:text-sm">
        © 2026 Student Progress Report
      </footer>
    </main>
  );
}