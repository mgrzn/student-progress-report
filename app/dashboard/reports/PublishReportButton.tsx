"use client";

import { useRef, useTransition } from "react";
import { publishReport } from "./actions";
import { useNotification } from "@/app/components/NotificationProvider";

type Props = {
  reportId: string;
  disabled?: boolean;
  published?: boolean;
};

export default function PublishReportButton({
  reportId,
  disabled = false,
  published = false,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useNotification();

  async function handlePublish() {
    const confirmed = await confirmAction({
      title: published ? "Publikasikan Ulang Laporan?" : "Publikasikan Laporan?",
      message: published
        ? "PDF terbaru akan menjadi laporan yang dapat diakses wali murid. Lanjutkan?"
        : "Pastikan nilai dan deskripsi sudah benar. Setelah dipublikasikan, wali murid dapat melihat dan mengunduh laporan ini.",
      confirmText: published ? "Publikasikan Ulang" : "Ya, Publikasikan",
      cancelText: "Periksa Kembali",
    });

    if (!confirmed || !formRef.current) return;

    const formData = new FormData(formRef.current);

    startTransition(() => {
      publishReport(formData);
    });
  }

  return (
    <form ref={formRef}>
      <input type="hidden" name="report_id" value={reportId} />

      <button
        type="button"
        onClick={handlePublish}
        disabled={disabled || isPending}
        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isPending
          ? "Memproses..."
          : published
            ? "Publikasikan Ulang"
            : "Publikasikan Laporan"}
      </button>
    </form>
  );
}