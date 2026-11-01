
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  CalendarDays,
  ClipboardList,
  FileText,
  UserRound,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

type DashboardSidebarProps = {
  fullName: string;
};

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Manajemen Akun",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    label: "Data Siswa",
    href: "/dashboard/students",
    icon: GraduationCap,
  },
  {
    label: "Data Kelas",
    href: "/dashboard/classes",
    icon: School,
  },
  {
    label: "Periode Akademik",
    href: "/dashboard/periods",
    icon: CalendarDays,
  },
  {
    label: "Penilaian",
    href: "/dashboard/assessments",
    icon: ClipboardList,
  },
  {
    label: "Laporan",
    href: "/dashboard/reports",
    icon: FileText,
  },
];

export default function DashboardSidebar({
  fullName,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Header mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-slate-950 px-4 text-white shadow-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <GraduationCap size={25} />
          <span className="font-bold">Student Progress</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-800"
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Overlay mobile */}
      {isOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="rounded-xl bg-blue-600 p-2">
              <GraduationCap size={24} />
            </div>

            <div>
              <p className="font-bold">Student Progress</p>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-800 md:hidden"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Menu Utama
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-5 border-t border-slate-800" />

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Preview
          </p>

          <Link
            href="/parent"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <UserRound size={19} />
            <span>Halaman Wali Murid</span>
            <ExternalLink size={14} className="ml-auto" />
          </Link>

          <Link
            href="/teacher"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <GraduationCap size={19} />
            <span>Halaman Guru</span>
            <ExternalLink size={14} className="ml-auto" />
          </Link>
        </nav>

        {/* Profile */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600">
              <UserRound size={20} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="mt-3 w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Keluar
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
