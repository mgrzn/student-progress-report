
"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// =====================================================
// AUTHENTICATION
// =====================================================

async function checkStaff() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  // Parent hanya boleh mengakses portal setelah disetujui.
  if (profile.role === "parent") {
    if (profile.approval_status !== "approved") {
      redirect("/pending-approval");
    }

    redirect("/parent");
  }

  // Hanya Admin dan Teacher yang boleh menjalankan server actions ini.
  if (!["admin", "teacher"].includes(profile.role)) {
    redirect("/login");
  }

  // Teacher wajib sudah mendapat persetujuan Admin.
  if (
    profile.role === "teacher" &&
    profile.approval_status !== "approved"
  ) {
    redirect("/pending-approval");
  }

  return { supabase, user };
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Konfigurasi Supabase Admin belum lengkap.");
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =====================================================
// CONSTANTS & HELPERS
// =====================================================

const CODES = ["CL1", "CL2", "CL3"] as const;
type ComponentCode = (typeof CODES)[number];

const COLORS = {
  navy: rgb(0.08, 0.17, 0.32),
  blue: rgb(0.15, 0.36, 0.65),
  lightBlue: rgb(0.92, 0.95, 0.98),
  border: rgb(0.80, 0.85, 0.91),
  text: rgb(0.16, 0.20, 0.27),
  muted: rgb(0.43, 0.47, 0.54),
  white: rgb(1, 1, 1),
  cl1: rgb(0.20, 0.43, 0.78),
  cl2: rgb(0.16, 0.58, 0.40),
  cl3: rgb(0.91, 0.52, 0.16),
};

const W = 595.28;
const H = 841.89;
const M = 35;
const CONTENT_WIDTH = W - M * 2;
const FOOTER_TOP = 802;

function formatDate(value: string | null) {
  if (!value) {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  }

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonth(monthNumber: number | null) {
  const months = [
    "Januari", "Februari", "Maret", "April",
    "Mei", "Juni", "Juli", "Agustus",
    "September", "Oktober", "November", "Desember",
  ];

  if (!monthNumber || monthNumber < 1 || monthNumber > 12) {
    return "-";
  }

  return months[monthNumber - 1];
}

function normalizeStoragePath(path: string | null | undefined) {
  if (!path) return null;

  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^signatures\//i, "");
}

function wrapText(
  value: string,
  font: any,
  size: number,
  maxWidth: number
) {
  const paragraphs = String(value || "-").split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      continue;
    }

    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
        current = "";
      }

      // Menangani kata panjang tanpa spasi.
      let remaining = word;

      while (
        remaining.length > 0 &&
        font.widthOfTextAtSize(remaining, size) > maxWidth
      ) {
        let cut = 1;

        while (
          cut < remaining.length &&
          font.widthOfTextAtSize(remaining.slice(0, cut + 1), size) <=
            maxWidth
        ) {
          cut++;
        }

        lines.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }

      current = remaining;
    }

    if (current) lines.push(current);
  }

  return lines.length ? lines : ["-"];
}

// =====================================================
// SAVE REPORT SUMMARY
// =====================================================

export async function saveReportSummary(formData: FormData) {
  const { supabase } = await checkStaff();

  const reportId = String(formData.get("report_id") || "");

  if (!reportId) {
    throw new Error("Laporan siswa tidak ditemukan.");
  }

  const descriptions: Record<ComponentCode, string> = {
    CL1: String(formData.get("CL1_description") || "").trim(),
    CL2: String(formData.get("CL2_description") || "").trim(),
    CL3: String(formData.get("CL3_description") || "").trim(),
  };

  const { data: report, error: reportError } = await supabase
    .from("student_reports")
    .select("id")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new Error("Data laporan tidak ditemukan.");
  }

  const { data: components, error: componentError } = await supabase
    .from("assessment_components")
    .select("id, code")
    .in("code", [...CODES]);

  if (componentError) throw new Error(componentError.message);

  const componentMap = Object.fromEntries(
    (components || []).map((item) => [item.code, item.id])
  );

  for (const code of CODES) {
    if (!componentMap[code]) {
      throw new Error(`Komponen ${code} belum tersedia.`);
    }
  }

  const { data: weekly, error: weeklyError } = await supabase
    .from("weekly_assessments")
    .select("id")
    .eq("report_id", reportId);

  if (weeklyError) throw new Error(weeklyError.message);

  const weeklyIds = (weekly || []).map((item) => item.id);

  if (!weeklyIds.length) {
    throw new Error("Belum ada penilaian mingguan.");
  }

  const { data: scores, error: scoreError } = await supabase
    .from("weekly_assessment_scores")
    .select("weekly_assessment_id, component_id, score")
    .in("weekly_assessment_id", weeklyIds);

  if (scoreError) throw new Error(scoreError.message);

  const summaryRows = CODES.map((code) => {
    const values = (scores || [])
      .filter(
        (item) =>
          item.component_id === componentMap[code] &&
          item.score !== null
      )
      .map((item) => Number(item.score));

    const average = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;

    return {
      report_id: reportId,
      component_id: componentMap[code],
      average_score: average === null ? null : Number(average.toFixed(2)),
      final_description: descriptions[code] || null,
    };
  });

  const { error: saveError } = await supabase
    .from("report_summaries")
    .upsert(summaryRows, {
      onConflict: "report_id,component_id",
    });

  if (saveError) throw new Error(saveError.message);


  const { error: statusError } = await supabase
  .from("student_reports")
  .update({
    status: "draft",
    pdf_is_current: false,
  })
  .eq("id", reportId);

  if (statusError) throw new Error(statusError.message);


  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  revalidatePath("/parent");

  redirect(`/dashboard/reports?report_id=${reportId}&saved=1`);
}

// =====================================================
// GENERATE PDF
// =====================================================

export async function generateReportPdf(formData: FormData) {
  const { supabase, user } = await checkStaff();

  const reportId = String(formData.get("report_id") || "");

  if (!reportId) {
    throw new Error("ID laporan tidak ditemukan.");
  }

  const { data: report, error: reportError } = await supabase
    .from("student_reports")
    .select("id, student_id, academic_period_id, instructor_name, report_date")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new Error("Laporan siswa tidak ditemukan.");
  }

  const adminClient = getAdminClient();

  // ---------------------------------------------------
  // PROFIL PENGAJAR
  // ---------------------------------------------------

  const { data: teacherProfile, error: teacherError } = await adminClient
    .from("profiles")
    .select("full_name, signature_path")
    .eq("id", user.id)
    .single();

  if (teacherError || !teacherProfile?.full_name) {
    throw new Error("Nama pengajar pada profil belum tersedia.");
  }

  const instructorName = teacherProfile.full_name;
  const teacherPath = normalizeStoragePath(teacherProfile.signature_path);

  const { error: instructorUpdateError } = await supabase
    .from("student_reports")
    .update({ instructor_name: instructorName })
    .eq("id", reportId);

  if (instructorUpdateError) {
    throw new Error(instructorUpdateError.message);
  }

  // ---------------------------------------------------
  // DATA SISWA, PERIODE, RINGKASAN
  // ---------------------------------------------------

  const [
    { data: student, error: studentError },
    { data: period, error: periodError },
    { data: summaries, error: summaryError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("full_name, student_code, class_id")
      .eq("id", report.student_id)
      .single(),

    supabase
      .from("academic_periods")
      .select("academic_year, semester, total_weeks")
      .eq("id", report.academic_period_id)
      .single(),

    supabase
      .from("report_summaries")
      .select("component_id, final_description")
      .eq("report_id", reportId),
  ]);

  if (studentError || !student) {
    throw new Error("Data siswa tidak ditemukan.");
  }

  if (periodError || !period) {
    throw new Error("Periode akademik tidak ditemukan.");
  }

  if (summaryError) throw new Error(summaryError.message);

  let className = "-";

  if (student.class_id) {
    const { data: classData } = await supabase
      .from("classes")
      .select("name")
      .eq("id", student.class_id)
      .maybeSingle();

    className = classData?.name || "-";
  }

  // ---------------------------------------------------
  // KOMPONEN PENILAIAN
  // ---------------------------------------------------

  const { data: components, error: componentError } = await supabase
    .from("assessment_components")
    .select("id, code, name, weight")
    .in("code", [...CODES]);

  if (componentError) throw new Error(componentError.message);

  const componentList = (components || []).sort(
    (a, b) =>
      CODES.indexOf(a.code as ComponentCode) -
      CODES.indexOf(b.code as ComponentCode)
  );

  const componentMap = Object.fromEntries(
    componentList.map((item) => [item.code, item.id])
  );

  for (const code of CODES) {
    if (!componentMap[code]) {
      throw new Error(`Komponen ${code} belum tersedia.`);
    }
  }

  // ---------------------------------------------------
  // PENILAIAN MINGGUAN
  // ---------------------------------------------------

  const { data: weekly, error: weeklyError } = await supabase
    .from("weekly_assessments")
    .select("id, week_number, month_number, progress_note")
    .eq("report_id", reportId)
    .order("month_number", { ascending: true, nullsFirst: false })
    .order("week_number", { ascending: true });

  if (weeklyError) throw new Error(weeklyError.message);

  const weeklyList = weekly || [];
  const weeklyIds = weeklyList.map((item) => item.id);

  let scores: {
    weekly_assessment_id: string;
    component_id: string;
    score: number | null;
  }[] = [];

  if (weeklyIds.length) {
    const { data, error } = await supabase
      .from("weekly_assessment_scores")
      .select("weekly_assessment_id, component_id, score")
      .in("weekly_assessment_id", weeklyIds);

    if (error) throw new Error(error.message);

    scores = (data || []) as typeof scores;
  }

  // ---------------------------------------------------
  // RATA-RATA
  // ---------------------------------------------------

  const averageMap: Record<string, number | null> = {};

  for (const component of componentList) {
    const values = scores
      .filter(
        (item) =>
          item.component_id === component.id &&
          item.score !== null
      )
      .map((item) => Number(item.score));

    averageMap[component.code] = values.length
      ? Number(
          (
            values.reduce((sum, value) => sum + value, 0) /
            values.length
          ).toFixed(2)
        )
      : null;
  }

  const summaryMap = Object.fromEntries(
    (summaries || []).map((item) => [
      item.component_id,
      item.final_description,
    ])
  );

  // ---------------------------------------------------
  // PDF SETUP
  // ---------------------------------------------------

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ---------------------------------------------------
  // TANDA TANGAN
  // ---------------------------------------------------

  const { data: reportSettings, error: settingsError } = await adminClient
    .from("report_settings")
    .select("pembina_name, pembina_signature_path")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    throw new Error(
      `Gagal mengambil pengaturan pembina: ${settingsError.message}`
    );
  }

  const pembinaName = reportSettings?.pembina_name || "Pembina";

  const pembinaPath = normalizeStoragePath(
    reportSettings?.pembina_signature_path || "pembina.jpg"
  );

  async function loadSignature(path: string | null, label: string) {
    if (!path) {
      console.warn(`Path TTD ${label} belum diatur di database.`);
      return null;
    }

    const { data, error } = await adminClient.storage
      .from("signatures")
      .download(path);

    if (error || !data) {
      console.error(
        `Gagal download TTD ${label}. Path: ${path}`,
        error?.message
      );
      return null;
    }

    try {
      return await pdf.embedJpg(
        new Uint8Array(await data.arrayBuffer())
      );
    } catch (embedError) {
      console.error(
        `Gagal embed gambar TTD ${label}. Path: ${path}`,
        embedError
      );
      return null;
    }
  }

  const [pembinaSignature, teacherSignature] = await Promise.all([
    loadSignature(pembinaPath, "Pembina"),
    loadSignature(teacherPath, "Pengajar"),
  ]);

  // ---------------------------------------------------
  // DRAWING HELPERS
  // ---------------------------------------------------

  const colorMap: Record<string, ReturnType<typeof rgb>> = {
    CL1: COLORS.cl1,
    CL2: COLORS.cl2,
    CL3: COLORS.cl3,
  };

  const reportDate = formatDate(report.report_date);

  let page = pdf.addPage([W, H]);
  let cursor = 0;

  function drawRect(
    targetPage: any,
    x: number,
    top: number,
    width: number,
    height: number,
    color = COLORS.white,
    borderColor?: ReturnType<typeof rgb>
  ) {
    targetPage.drawRectangle({
      x,
      y: H - top - height,
      width,
      height,
      color,
      borderColor,
      borderWidth: borderColor ? 0.7 : 0,
    });
  }

  function drawText(
    targetPage: any,
    value: string | number,
    x: number,
    top: number,
    size = 9,
    bold = false,
    color = COLORS.text,
    maxWidth?: number
  ) {
    targetPage.drawText(String(value ?? "-"), {
      x,
      y: H - top - size,
      size,
      font: bold ? boldFont : font,
      color,
      ...(maxWidth ? { maxWidth } : {}),
    });
  }

  function drawLine(
    targetPage: any,
    x1: number,
    top: number,
    x2: number,
    color = COLORS.border,
    thickness = 0.7
  ) {
    targetPage.drawLine({
      start: { x: x1, y: H - top },
      end: { x: x2, y: H - top },
      color,
      thickness,
    });
  }

  function drawWrapped(
    targetPage: any,
    value: string,
    x: number,
    top: number,
    width: number,
    size = 8,
    lineHeight = 11,
    color = COLORS.text
  ) {
    const lines = wrapText(value, font, size, width);

    lines.forEach((line, index) => {
      drawText(
        targetPage,
        line,
        x,
        top + index * lineHeight,
        size,
        false,
        color,
        width
      );
    });

    return Math.max(1, lines.length) * lineHeight;
  }

  function sectionTitle(
    targetPage: any,
    title: string,
    top: number
  ) {
    drawRect(targetPage, M, top, 5, 17, COLORS.blue);
    drawText(
      targetPage,
      title,
      M + 13,
      top + 3,
      10,
      true,
      COLORS.navy
    );
  }

  function drawFooter(targetPage: any, number: number, total: number) {
    drawLine(targetPage, M, FOOTER_TOP, W - M);

    drawText(
      targetPage,
      "Qur'an & Basic Universal Skills",
      M,
      812,
      7,
      false,
      COLORS.muted
    );

    drawText(
      targetPage,
      `Halaman ${number} dari ${total}`,
      W - M - 90,
      812,
      7,
      false,
      COLORS.muted
    );
  }

  function addContinuationPage(title: string, subtitle: string) {
    const newPage = pdf.addPage([W, H]);

    drawRect(newPage, 0, 0, W, 82, COLORS.navy);

    drawText(
      newPage,
      title,
      M,
      23,
      16,
      true,
      COLORS.white
    );

    drawText(
      newPage,
      subtitle,
      M,
      52,
      9,
      false,
      rgb(0.83, 0.88, 0.96)
    );

    return newPage;
  }

  // ===================================================
  // HALAMAN 1 - IDENTITAS
  // ===================================================

  drawRect(page, 0, 0, W, 92, COLORS.navy);

  drawText(
    page,
    "PORTOFOLIO CAPAIAN BELAJAR SISWA",
    M,
    23,
    17,
    true,
    COLORS.white
  );

  drawText(
    page,
    "PROGRAM QUR'AN & BASIC UNIVERSAL SKILLS",
    M,
    51,
    9,
    false,
    rgb(0.83, 0.88, 0.96)
  );

  drawText(
    page,
    `TAHUN AJARAN ${period.academic_year}`,
    M,
    69,
    8,
    true,
    COLORS.white
  );

  drawText(
    page,
    `SEMESTER ${period.semester}`,
    W - M - 100,
    69,
    8,
    true,
    COLORS.white
  );

  // IDENTITAS DINAMIS

  drawRect(page, M, 108, CONTENT_WIDTH, 112, COLORS.white, COLORS.border);
  drawRect(page, M + 13, 120, 75, 87, COLORS.lightBlue, COLORS.border);

  drawText(page, "FOTO", M + 32, 153, 11, true, COLORS.blue);
  drawText(page, "SISWA", M + 29, 169, 8, true, COLORS.blue);

  drawText(page, "IDENTITAS SISWA", M + 103, 120, 10, true, COLORS.navy);

  const identity = [
    ["Nama Siswa", student.full_name],
    ["Kode Siswa", student.student_code || "-"],
    ["Kelas", className],
    ["Pengajar", instructorName],
    ["Tanggal Laporan", reportDate],
  ];

  let identityTop = 140;

  identity.forEach(([label, value]) => {
    drawText(page, label, M + 103, identityTop, 8, false, COLORS.muted);
    drawText(page, ":", M + 190, identityTop, 8, false, COLORS.muted);

    const height = drawWrapped(
      page,
      String(value || "-"),
      M + 200,
      identityTop,
      260,
      8,
      10
    );

    identityTop += Math.max(14, height + 2);
  });

  // KOMPONEN PENILAIAN

  sectionTitle(page, "KOMPONEN PENILAIAN", 237);

  const cardGap = 9;
  const cardWidth = (CONTENT_WIDTH - cardGap * 2) / 3;

  componentList.forEach((component, index) => {
    const x = M + index * (cardWidth + cardGap);
    const color = colorMap[component.code] || COLORS.blue;

    drawRect(
      page,
      x,
      263,
      cardWidth,
      46,
      COLORS.lightBlue,
      COLORS.border
    );

    drawWrapped(
      page,
      `${component.code} - ${component.name}`,
      x + 9,
      271,
      cardWidth - 18,
      8,
      9,
      color
    );

    drawText(
      page,
      `Bobot: ${Number(component.weight)}%`,
      x + 9,
      292,
      8,
      false,
      COLORS.muted
    );
  });

  // ===================================================
  // TABEL MINGGUAN DENGAN PAGINATION
  // ===================================================

  sectionTitle(page, "REKAP PENILAIAN MINGGUAN", 326);

  const columns = [
    { label: "Minggu", width: 48 },
    { label: "Bulan", width: 68 },
    { label: "CL1", width: 48 },
    { label: "CL2", width: 48 },
    { label: "CL3", width: 48 },
    {
      label: "Keterangan / Progress Note",
      width: CONTENT_WIDTH - 260,
    },
  ];

  const headerHeight = 29;
  const noteWidth = columns[5].width - 12;
  const noteFontSize = 7;
  const noteLineHeight = 9;

  let tablePage = page;
  let tableTop = 352;
  let pageNumber = 1;

  function drawWeeklyHeader(targetPage: any, top: number) {
    drawRect(
      targetPage,
      M,
      top,
      CONTENT_WIDTH,
      headerHeight,
      COLORS.lightBlue,
      COLORS.border
    );

    let x = M;

    columns.forEach((column) => {
      drawText(
        targetPage,
        column.label,
        x + 5,
        top + 10,
        7.5,
        true,
        COLORS.navy,
        column.width - 10
      );

      x += column.width;
    });
  }

  function newWeeklyPage() {
    tablePage = addContinuationPage(
      "REKAP PENILAIAN MINGGUAN",
      `${student!.full_name} | Lanjutan`
    );

    pageNumber++;
    tableTop = 105;
    drawWeeklyHeader(tablePage, tableTop);
    tableTop += headerHeight;
  }

  drawWeeklyHeader(tablePage, tableTop);
  tableTop += headerHeight;

  if (!weeklyList.length) {
    drawRect(
      tablePage,
      M,
      tableTop,
      CONTENT_WIDTH,
      40,
      COLORS.white,
      COLORS.border
    );

    drawText(
      tablePage,
      "Belum ada penilaian mingguan.",
      M + 10,
      tableTop + 14,
      8,
      false,
      COLORS.muted
    );

    tableTop += 40;
  }

  weeklyList.forEach((item, index) => {
    const noteLines = wrapText(
      item.progress_note || "-",
      font,
      noteFontSize,
      noteWidth
    );

    const rowHeight = Math.max(
      26,
      noteLines.length * noteLineHeight + 10
    );

    // Jika satu baris terlalu tinggi untuk ruang halaman,
    // pecah teks catatan menjadi beberapa bagian.
    const maxRowHeight = 650;

    if (tableTop + Math.min(rowHeight, maxRowHeight) > 785) {
      newWeeklyPage();
    }

    const values = componentList.map((component) => {
      const score = scores.find(
        (value) =>
          value.weekly_assessment_id === item.id &&
          value.component_id === component.id
      );

      return score?.score === null || score?.score === undefined
        ? "-"
        : String(score.score);
    });

    const cells = [
      String(item.week_number),
      formatMonth(item.month_number),
      values[0] || "-",
      values[1] || "-",
      values[2] || "-",
    ];

    // Catatan sangat panjang dipecah menjadi beberapa blok baris.
    const linesPerBlock = Math.max(
      1,
      Math.floor((785 - tableTop - 10) / noteLineHeight)
    );

    let lineOffset = 0;
    let firstBlock = true;

    while (lineOffset < noteLines.length) {
      const remainingLines = noteLines.length - lineOffset;
      const blockLineCount = Math.min(remainingLines, linesPerBlock);
      const blockHeight = Math.max(
        26,
        blockLineCount * noteLineHeight + 10
      );

      if (tableTop + blockHeight > 785) {
        newWeeklyPage();
      }

      drawRect(
        tablePage,
        M,
        tableTop,
        CONTENT_WIDTH,
        blockHeight,
        index % 2 === 0 ? COLORS.white : rgb(0.97, 0.98, 1),
        COLORS.border
      );

      if (firstBlock) {
        let x = M;

        cells.forEach((value, cellIndex) => {
          drawText(
            tablePage,
            value,
            x + 5,
            tableTop + Math.max(5, (blockHeight - 9) / 2),
            8,
            cellIndex === 0,
            COLORS.text,
            columns[cellIndex].width - 10
          );

          x += columns[cellIndex].width;
        });
      }

      const noteX = M + columns.slice(0, 5).reduce(
        (sum, column) => sum + column.width,
        0
      ) + 6;

      noteLines
        .slice(lineOffset, lineOffset + blockLineCount)
        .forEach((line, lineIndex) => {
          drawText(
            tablePage,
            line,
            noteX,
            tableTop + 5 + lineIndex * noteLineHeight,
            noteFontSize,
            false,
            COLORS.text,
            noteWidth
          );
        });

      tableTop += blockHeight;
      lineOffset += blockLineCount;
      firstBlock = false;

      if (lineOffset < noteLines.length) {
        newWeeklyPage();
      }
    }
  });

  // ===================================================
  // HALAMAN RINGKASAN
  // ===================================================

  page = addContinuationPage(
    "RINGKASAN CAPAIAN BELAJAR",
    `${student.full_name} | ${period.academic_year} | Semester ${period.semester}`
  );

  pageNumber++;

  sectionTitle(page, "RATA-RATA NILAI KOMPETENSI", 105);

  componentList.forEach((component, index) => {
    const x = M + index * (cardWidth + cardGap);
    const color = colorMap[component.code] || COLORS.blue;
    const average = averageMap[component.code];

    drawRect(
      page,
      x,
      132,
      cardWidth,
      76,
      COLORS.lightBlue,
      COLORS.border
    );

    drawWrapped(
      page,
      `${component.code} - ${component.name}`,
      x + 9,
      143,
      cardWidth - 18,
      8,
      9,
      color
    );

    drawText(
      page,
      average === null ? "-" : average.toFixed(2),
      x + 9,
      164,
      19,
      true,
      color
    );

    drawText(
      page,
      `Bobot ${Number(component.weight)}%`,
      x + 9,
      190,
      7,
      false,
      COLORS.muted
    );
  });

  // GRAFIK BATANG

  sectionTitle(page, "GRAFIK CAPAIAN BELAJAR", 229);

  const graphX = M;
  const graphTop = 255;
  const graphWidth = 245;
  const graphHeight = 170;

  drawRect(
    page,
    graphX,
    graphTop,
    graphWidth,
    graphHeight,
    COLORS.white,
    COLORS.border
  );

  const plotX = graphX + 35;
  const plotTop = graphTop + 20;
  const plotHeight = 115;
  const plotWidth = 190;

  [0, 25, 50, 75, 100].forEach((value) => {
    const y = plotTop + plotHeight - (value / 100) * plotHeight;

    page.drawLine({
      start: { x: plotX, y: H - y },
      end: { x: plotX + plotWidth, y: H - y },
      color: COLORS.border,
      thickness: 0.5,
    });

    drawText(page, value, graphX + 8, y - 4, 6.5, false, COLORS.muted);
  });

  componentList.forEach((component, index) => {
    const average = averageMap[component.code];

    if (average === null) return;

    const barWidth = 35;
    const x = plotX + 17 + index * 59;
    const barHeight = (average / 100) * plotHeight;
    const barTop = plotTop + plotHeight - barHeight;

    drawRect(
      page,
      x,
      barTop,
      barWidth,
      barHeight,
      colorMap[component.code] || COLORS.blue
    );

    drawText(
      page,
      average.toFixed(1),
      x - 2,
      barTop - 13,
      7,
      true,
      COLORS.navy
    );

    drawText(
      page,
      component.code,
      x + 5,
      plotTop + plotHeight + 9,
      8,
      true,
      COLORS.text
    );
  });

  // INFORMASI LAPORAN

  drawRect(
    page,
    M + 260,
    graphTop,
    CONTENT_WIDTH - 260,
    graphHeight,
    COLORS.lightBlue,
    COLORS.border
  );

  drawText(page, "INFORMASI LAPORAN", M + 272, graphTop + 15, 9, true, COLORS.navy);
  drawText(page, "Jumlah penilaian", M + 272, graphTop + 45, 8, false, COLORS.muted);
  drawText(page, `${weeklyList.length} minggu`, M + 272, graphTop + 60, 10, true, COLORS.text);
  drawText(page, "Tanggal laporan", M + 272, graphTop + 88, 8, false, COLORS.muted);

  drawWrapped(
    page,
    reportDate,
    M + 272,
    graphTop + 103,
    115,
    9,
    11
  );

  drawText(page, "Program", M + 272, graphTop + 132, 8, false, COLORS.muted);

  drawWrapped(
    page,
    "Qur'an & Basic Universal Skills",
    M + 272,
    graphTop + 147,
    120,
    7,
    9,
    COLORS.text
  );

  // ===================================================
  // URAIAN CAPAIAN - DYNAMIC HEIGHT & PAGINATION
  // ===================================================

  sectionTitle(page, "URAIAN CAPAIAN BELAJAR", 447);

  let descriptionPage = page;
  let descriptionTop = 475;

  const descriptionBottom = 775;
  const descriptionPadding = 14;
  const descriptionFontSize = 8;
  const descriptionLineHeight = 11;
  const descriptionWidth = CONTENT_WIDTH - 28;

  componentList.forEach((component) => {
    const color = colorMap[component.code] || COLORS.blue;

    const description =
      summaryMap[component.id] || "Belum ada deskripsi capaian.";

    const lines = wrapText(
      description,
      font,
      descriptionFontSize,
      descriptionWidth
    );

    let lineOffset = 0;
    let firstBlock = true;

    while (lineOffset < lines.length) {
      const titleHeight = firstBlock ? 27 : 10;
      const availableHeight =
        descriptionBottom - descriptionTop - titleHeight - 12;

      if (availableHeight < descriptionLineHeight) {
        descriptionPage = addContinuationPage(
          "URAIAN CAPAIAN BELAJAR",
          `${student.full_name} | Lanjutan uraian capaian`
        );

        descriptionTop = 105;
      }

      const maxLines = Math.max(
        1,
        Math.floor(
          (descriptionBottom - descriptionTop - titleHeight - 12) /
            descriptionLineHeight
        )
      );

      const blockLines = lines.slice(
        lineOffset,
        lineOffset + maxLines
      );

      const blockHeight =
        titleHeight +
        blockLines.length * descriptionLineHeight +
        12;

      drawRect(
        descriptionPage,
        M,
        descriptionTop,
        CONTENT_WIDTH,
        blockHeight,
        COLORS.white,
        COLORS.border
      );

      drawRect(
        descriptionPage,
        M,
        descriptionTop,
        5,
        blockHeight,
        color
      );

      if (firstBlock) {
        drawText(
          descriptionPage,
          `${component.code} - ${component.name}`,
          M + 14,
          descriptionTop + 9,
          9,
          true,
          color
        );
      } else {
        drawText(
          descriptionPage,
          `${component.code} - ${component.name} (lanjutan)`,
          M + 14,
          descriptionTop + 5,
          8,
          true,
          color
        );
      }

      const textTop = descriptionTop + titleHeight;

      blockLines.forEach((line, index) => {
        drawText(
          descriptionPage,
          line,
          M + 14,
          textTop + index * descriptionLineHeight,
          descriptionFontSize,
          false,
          COLORS.text,
          descriptionWidth
        );
      });

      descriptionTop += blockHeight + 8;
      lineOffset += blockLines.length;
      firstBlock = false;

      if (lineOffset < lines.length) {
        descriptionPage = addContinuationPage(
          "URAIAN CAPAIAN BELAJAR",
          `${student.full_name} | Lanjutan uraian capaian`
        );

        descriptionTop = 105;
      }
    }
  });

  // ===================================================
  // TANDA TANGAN - POSISI DINAMIS
  // ===================================================

  const signatureHeight = 105;

  if (descriptionTop + signatureHeight > 785) {
    descriptionPage = addContinuationPage(
      "PENGESAHAN LAPORAN",
      `${student.full_name} | Tanda tangan pengajar dan pembina`
    );

    descriptionTop = 115;
  }

  const signatureTop = Math.max(descriptionTop + 10, 120);

  const leftX = M + 35;
  const rightX = W - M - 180;

  drawText(descriptionPage, "Mengetahui,", leftX, signatureTop, 8);
  drawText(descriptionPage, "Pengajar,", rightX, signatureTop, 8);

  drawText(
    descriptionPage,
    "Pembina",
    leftX,
    signatureTop + 13,
    9,
    true,
    COLORS.navy
  );

  drawText(
    descriptionPage,
    instructorName,
    rightX,
    signatureTop + 13,
    9,
    true,
    COLORS.navy,
    165
  );

  const signatureImageTop = signatureTop + 29;
  const signatureImageHeight = 35;
  const signatureMaxWidth = 115;

  if (pembinaSignature) {
    const scale = Math.min(
      signatureMaxWidth / pembinaSignature.width,
      signatureImageHeight / pembinaSignature.height
    );

    const width = pembinaSignature.width * scale;
    const height = pembinaSignature.height * scale;

    descriptionPage.drawImage(pembinaSignature, {
      x: leftX + 15,
      y: H - signatureImageTop - height,
      width,
      height,
    });
  }

  if (teacherSignature) {
    const scale = Math.min(
      signatureMaxWidth / teacherSignature.width,
      signatureImageHeight / teacherSignature.height
    );

    const width = teacherSignature.width * scale;
    const height = teacherSignature.height * scale;

    descriptionPage.drawImage(teacherSignature, {
      x: rightX + 5,
      y: H - signatureImageTop - height,
      width,
      height,
    });
  }

  drawLine(
    descriptionPage,
    M + 25,
    signatureTop + 75,
    M + 190,
    COLORS.navy
  );

  drawLine(
    descriptionPage,
    W - M - 175,
    signatureTop + 75,
    W - M - 10,
    COLORS.navy
  );

  drawWrapped(
    descriptionPage,
    pembinaName,
    M + 25,
    signatureTop + 80,
    165,
    8,
    10,
    COLORS.text
  );

  drawWrapped(
    descriptionPage,
    instructorName,
    W - M - 175,
    signatureTop + 80,
    165,
    8,
    10,
    COLORS.text
  );

  // ===================================================
  // FOOTER SEMUA HALAMAN
  // ===================================================

  const allPages = pdf.getPages();
  const totalPages = allPages.length;

  allPages.forEach((currentPage, index) => {
    drawFooter(currentPage, index + 1, totalPages);
  });

  // ===================================================
  // UPLOAD PDF DAN SIMPAN VERSI
  // ===================================================

  const pdfBytes = await pdf.save();

  const { data: previousVersions, error: versionError } = await supabase
    .from("generated_reports")
    .select("version")
    .eq("report_id", reportId)
    .order("version", { ascending: false })
    .limit(1);

  if (versionError) throw new Error(versionError.message);

  const version = (previousVersions?.[0]?.version || 0) + 1;
  const storagePath = `${reportId}/report-v${version}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal upload PDF: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase
    .from("generated_reports")
    .insert({
      report_id: reportId,
      version,
      storage_path: storagePath,
      generated_by: user.id,
    });

  if (insertError) {
    await supabase.storage.from("reports").remove([storagePath]);
    throw new Error(insertError.message);
  }
  const { error: currentError } = await supabase
  .from("student_reports")
  .update({ pdf_is_current: true })
  .eq("id", reportId);

  if (currentError) {
    throw new Error(
     `PDF berhasil dibuat, tetapi status PDF gagal diperbarui: ${currentError.message}`
   );
  }

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  revalidatePath("/parent");

  redirect(
    `/dashboard/reports?report_id=${reportId}&generated=${version}`
  );
}

// =====================================================
// PUBLISH REPORT
// =====================================================


// =====================================================
// PUBLISH REPORT
// =====================================================

export async function publishReport(formData: FormData) {
  const { supabase } = await checkStaff();

  const reportId = String(formData.get("report_id") || "");

  if (!reportId) {
    redirect("/dashboard/reports?error=report_not_found");
  }

  const reportUrl = `/dashboard/reports?report_id=${encodeURIComponent(reportId)}`;

  const { data: report, error: reportError } = await supabase
    .from("student_reports")
    .select("id, pdf_is_current")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    redirect(`${reportUrl}&error=report_not_found`);
  }

  if (!report.pdf_is_current) {
    redirect(`${reportUrl}&error=pdf_stale`);
  }

  const { data: components, error: componentError } = await supabase
    .from("assessment_components")
    .select("id, code")
    .in("code", [...CODES]);

  if (componentError) {
    console.error("Gagal mengambil komponen:", componentError.message);
    redirect(`${reportUrl}&error=publish_failed`);
  }

  const componentMap = Object.fromEntries(
    (components || []).map((item) => [item.code, item.id])
  );

  for (const code of CODES) {
    if (!componentMap[code]) {
      console.error(`Komponen ${code} belum tersedia.`);
      redirect(`${reportUrl}&error=publish_failed`);
    }
  }

  const { data: summaries, error: summaryError } = await supabase
    .from("report_summaries")
    .select("component_id, final_description")
    .eq("report_id", reportId);

  if (summaryError) {
    console.error("Gagal mengambil ringkasan:", summaryError.message);
    redirect(`${reportUrl}&error=publish_failed`);
  }

  for (const code of CODES) {
    const summary = (summaries || []).find(
      (item) => item.component_id === componentMap[code]
    );

    if (!summary || !summary.final_description?.trim()) {
      redirect(`${reportUrl}&error=missing_descriptions`);
    }
  }

  const { data: pdf, error: pdfError } = await supabase
    .from("generated_reports")
    .select("id, version")
    .eq("report_id", reportId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pdfError) {
    console.error("Gagal mengambil PDF:", pdfError.message);
    redirect(`${reportUrl}&error=publish_failed`);
  }

  if (!pdf) {
    redirect(`${reportUrl}&error=no_pdf`);
  }

  const { data: weekly, error: weeklyError } = await supabase
    .from("weekly_assessments")
    .select("id")
    .eq("report_id", reportId);

  if (weeklyError) {
    console.error("Gagal mengambil penilaian mingguan:", weeklyError.message);
    redirect(`${reportUrl}&error=publish_failed`);
  }

  if (!weekly || weekly.length === 0) {
    redirect(`${reportUrl}&error=no_weekly`);
  }

  const { error: publishError } = await supabase
    .from("student_reports")
    .update({ status: "published" })
    .eq("id", reportId);

  if (publishError) {
    console.error("Gagal mempublikasikan laporan:", publishError.message);
    redirect(`${reportUrl}&error=publish_failed`);
  }

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  revalidatePath("/parent");

  redirect(`${reportUrl}&published=1`);
}