
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  GraduationCap,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  LogOut,
} from "lucide-react";

type Props = {
  fullName: string;
  role: "teacher" | "parent";
};

export default function PortalSidebar({ fullName, role }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isTeacher = role === "teacher";

  const menuItems = isTeacher
    ? [
        {
          label: "Dashboard",
          href: "/teacher",
          icon: LayoutDashboard,
        },
        {
          label: "Data Siswa",
          href: "/dashboard/students",
          icon: Users,
        },
        {
          label: "Penilaian Mingguan",
          href: "/dashboard/assessments",
          icon: ClipboardList,
        },
        {
          label: "Laporan Perkembangan",
          href: "/dashboard/reports",
          icon: FileText,
        },
      ]
    : [
        {
          label: "Dashboard",
          href: "/parent",
          icon: LayoutDashboard,
        },
      ];

  function activeLink(href: string) {
    return pathname === href;
  }

  return (
    <>
      {/* Header Mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-slate-950 px-4 text-white shadow-md md:hidden">
        <Link
          href={isTeacher ? "/teacher" : "/parent"}
          className="flex items-center gap-2"
        >
          <GraduationCap size={25} />
          <span className="font-bold">Student Progress</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Overlay */}
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
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
          <div className="rounded-xl bg-blue-600 p-2">
            <GraduationCap size={25} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">Student Progress</p>
            <p className="text-xs text-slate-400">
              {isTeacher ? "Teacher Portal" : "Parent Portal"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-800 md:hidden"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Menu Utama
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeLink(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Profile */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 rounded-xl bg-slate-900 p-3">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="mt-1 text-xs text-slate-400">
              {isTeacher ? "Guru" : "Wali Murid"}
            </p>
          </div>

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut size={18} />
              Keluar
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
