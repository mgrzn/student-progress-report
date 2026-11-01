
"use client";

import { useEffect } from "react";
import { useNotification } from "@/app/components/NotificationProvider";

type Props = {
  saved?: string;
  error?: string;
};

export default function AssessmentNotifications({
  saved,
  error,
}: Props) {
  const { showToast } = useNotification();

  useEffect(() => {
    if (saved === "1") {
      showToast("success", "Penilaian mingguan berhasil disimpan.");
    }

    if (error) {
      const messages: Record<string, string> = {
        invalid_student: "Siswa wajib dipilih.",
        invalid_week: "Minggu harus dipilih antara 1 sampai 4.",
        invalid_month: "Bulan wajib dipilih.",
        invalid_score: "Nilai harus berada di antara 0 sampai 100.",
        no_period: "Belum ada periode akademik yang aktif.",
        student_not_found: "Data siswa tidak ditemukan.",
        missing_components: "Komponen CL1, CL2, atau CL3 belum tersedia.",
        save_failed: "Penilaian gagal disimpan. Silakan coba kembali.",
      };

      showToast(
        "error",
        messages[error] || "Terjadi kesalahan. Silakan coba kembali."
      );
    }
  }, [saved, error, showToast]);

  return null;
}
