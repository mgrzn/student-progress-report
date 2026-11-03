
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function checkStaff() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, approval_status")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  if (profile.role === "parent") {
    redirect("/parent");
  }

  if (!["admin", "teacher"].includes(profile.role)) {
    redirect("/login");
  }

  if (
    profile.role === "teacher" &&
    profile.approval_status !== "approved"
  ) {
    redirect("/pending-approval");
  }

  return { supabase, user, profile };
}

function redirectAssessmentError(
  error: string,
  studentId = "",
  month = 1,
  week = 1
): never {
  const params = new URLSearchParams({
    error,
    student_id: studentId,
    month: String(month),
    week: String(week),
  });

  redirect(`/dashboard/assessments?${params.toString()}`);
}

export async function saveAssessment(formData: FormData) {
  const { supabase, user, profile } = await checkStaff();

  const studentId = String(formData.get("student_id") || "");
  const weekNumber = Number(formData.get("week_number"));
  const monthNumber = Number(formData.get("month_number"));
  const progressNote = String(
    formData.get("progress_note") || ""
  ).trim();

  const scores = {
    CL1: Number(formData.get("CL1")),
    CL2: Number(formData.get("CL2")),
    CL3: Number(formData.get("CL3")),
  };

  if (!studentId) {
    redirectAssessmentError("invalid_student");
  }

  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > 4
  ) {
    redirectAssessmentError(
      "invalid_week",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  if (
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    redirectAssessmentError(
      "invalid_month",
      studentId,
      1,
      weekNumber
    );
  }

  if (
    Object.values(scores).some(
      (score) =>
        !Number.isFinite(score) || score < 0 || score > 100
    )
  ) {
    redirectAssessmentError(
      "invalid_score",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  const { data: period, error: periodError } = await supabase
    .from("academic_periods")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (periodError) {
    redirectAssessmentError(
      "save_failed",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  if (!period) {
    redirectAssessmentError(
      "no_period",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    redirectAssessmentError(
      "save_failed",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  if (!student) {
    redirectAssessmentError(
      "student_not_found",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  const { data: existingReport, error: reportFetchError } =
    await supabase
      .from("student_reports")
      .select("id")
      .eq("student_id", studentId)
      .eq("academic_period_id", period.id)
      .maybeSingle();

  if (reportFetchError) {
    redirectAssessmentError(
      "save_failed",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  let reportId = existingReport?.id;

  if (!reportId) {
    const { data: newReport, error: insertReportError } =
      await supabase
        .from("student_reports")
        .insert({
          student_id: studentId,
          academic_period_id: period.id,
          instructor_name: profile.full_name,
          status: "draft",
          pdf_is_current: false,
        })
        .select("id")
        .single();

    if (insertReportError || !newReport) {
      redirectAssessmentError(
        "save_failed",
        studentId,
        monthNumber,
        weekNumber
      );
    }

    reportId = newReport.id;
  }

  const { data: components, error: componentError } =
    await supabase
      .from("assessment_components")
      .select("id, code")
      .in("code", ["CL1", "CL2", "CL3"]);

  if (componentError) {
    redirectAssessmentError(
      "save_failed",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  const componentMap = Object.fromEntries(
    (components || []).map((component) => [
      component.code,
      component.id,
    ])
  );

  if (
    !componentMap.CL1 ||
    !componentMap.CL2 ||
    !componentMap.CL3
  ) {
    redirectAssessmentError(
      "missing_components",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  const { error: resetStatusError } = await supabase
    .from("student_reports")
    .update({
      status: "draft",
      pdf_is_current: false,
    })
    .eq("id", reportId);

  if (resetStatusError) {
    redirectAssessmentError(
      "save_failed",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  const { data: weeklyAssessment, error: weeklyError } =
    await supabase
      .from("weekly_assessments")
      .upsert(
        {
          report_id: reportId,
          week_number: weekNumber,
          month_number: monthNumber,
          progress_note: progressNote || null,
          created_by: user.id,
        },
        {
          onConflict: "report_id,month_number,week_number",
        }
      )
      .select("id")
      .single();

  if (weeklyError || !weeklyAssessment) {
    redirectAssessmentError(
      "save_failed",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  const scoreRows = ["CL1", "CL2", "CL3"].map((code) => ({
    weekly_assessment_id: weeklyAssessment.id,
    component_id: componentMap[code],
    score: scores[code as keyof typeof scores],
  }));

  const { error: scoreError } = await supabase
    .from("weekly_assessment_scores")
    .upsert(scoreRows, {
      onConflict: "weekly_assessment_id,component_id",
    });

  if (scoreError) {
    redirectAssessmentError(
      "save_failed",
      studentId,
      monthNumber,
      weekNumber
    );
  }

  revalidatePath("/dashboard/assessments");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  revalidatePath("/parent");

  redirect(
    `/dashboard/assessments?saved=1&student_id=${studentId}&month=${monthNumber}&week=${weekNumber}`
  );
}
