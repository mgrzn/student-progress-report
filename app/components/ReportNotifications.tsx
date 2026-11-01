"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNotification } from "./NotificationProvider";

type Props = {
  reportId?: string;
  saved?: string;
  generated?: string;
  published?: string;
  error?: string;
};

export default function ReportNotifications({
  reportId,
  saved,
  generated,
  published,
  error,
}: Props) {
  const { showToast } = useNotification();
  const router = useRouter();
  const pathname = usePathname();
  const handledKey = useRef("");

  useEffect(() => {
    const key = [
      reportId || "",
      saved || "",
      generated || "",
      published || "",
      error || "",
    ].join("|");

    if (handledKey.current === key) return;

    if (!saved && !generated && !published && !error) return;

    handledKey.current = key;

    if (saved === "1") {
      showToast(
        "success",
        "Rekap dan deskripsi berhasil disimpan. Status laporan kembali menjadi Draft."
      );
    }

    if (generated) {
      showToast(
        "success",
        `PDF berhasil dibuat. Versi laporan: v${generated}.`
      );
    }

    if (published === "1") {
      showToast(
        "success",
        "Laporan berhasil dipublikasikan. Wali murid sekarang dapat melihat dan mengunduh PDF terbaru."
      );
    }

    const messages: Record<string, string> = {
      pdf_stale: "PDF belum diperbarui. Generate ulang PDF sebelum publikasi.",
      missing_descriptions: "Lengkapi deskripsi akhir CL1, CL2, dan CL3 terlebih dahulu.",
      no_weekly: "Belum ada penilaian mingguan untuk laporan ini.",
      no_pdf: "Buat PDF terlebih dahulu sebelum mempublikasikan laporan.",
      report_not_found: "Data laporan tidak ditemukan.",
      save_failed: "Rekap gagal disimpan. Silakan coba lagi.",
      publish_failed: "Laporan gagal dipublikasikan. Silakan coba lagi.",      
    };

    if (error) {
      showToast(
        error === "pdf_stale" || error === "missing_descriptions"
          ? "warning"
          : "error",
        messages[error] || "Terjadi kesalahan. Silakan coba lagi."
      );
    }

    const query = reportId
      ? `?report_id=${encodeURIComponent(reportId)}`
      : "";

    router.replace(`${pathname}${query}`);
  }, [
    reportId,
    saved,
    generated,
    published,
    error,
    pathname,
    router,
    showToast,
  ]);

  return null;
}