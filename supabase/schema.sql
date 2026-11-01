-- Skema awal. Review dan uji semua RLS sebelum memakai data siswa sungguhan.
create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','teacher','parent');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role public.app_role not null default 'parent',
 created_at timestamptz not null default now()
);
create table public.classes (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text
);
create table public.academic_periods (
 id uuid primary key default gen_random_uuid(),
 academic_year text not null,
 semester text not null,
 total_weeks integer not null default 11 check(total_weeks between 1 and 52),
 starts_on date,
 ends_on date,
 is_active boolean not null default false,
 unique(academic_year,semester)
);
create table public.students (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 student_code text unique,
 class_id uuid references public.classes(id) on delete set null,
 photo_path text,
 created_at timestamptz not null default now()
);
create table public.parent_students (
 parent_id uuid not null references public.profiles(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 relationship text,
 primary key(parent_id,student_id)
);
create table public.assessment_components (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 name text not null,
 weight numeric(5,2) not null check(weight between 0 and 100)
);
insert into public.assessment_components(code,name,weight) values
 ('CL1','Adab',40),('CL2','Cognitive',30),('CL3','Psychomotor',30)
on conflict(code) do nothing;

create table public.student_reports (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 academic_period_id uuid not null references public.academic_periods(id) on delete cascade,
 instructor_name text,
 report_date date,
 status text not null default 'draft' check(status in ('draft','published')),
 unique(student_id,academic_period_id)
);
create table public.weekly_assessments (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.student_reports(id) on delete cascade,
 week_number integer not null check(week_number between 1 and 52),
 progress_note text,
 created_by uuid references public.profiles(id),
 unique(report_id,week_number)
);
create table public.weekly_assessment_scores (
 id uuid primary key default gen_random_uuid(),
 weekly_assessment_id uuid not null references public.weekly_assessments(id) on delete cascade,
 component_id uuid not null references public.assessment_components(id),
 score numeric(5,2) check(score between 0 and 100),
 unique(weekly_assessment_id,component_id)
);
create table public.report_summaries (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.student_reports(id) on delete cascade,
 component_id uuid not null references public.assessment_components(id),
 final_description text,
 average_score numeric(5,2) check(average_score between 0 and 100),
 unique(report_id,component_id)
);
create table public.generated_reports (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.student_reports(id) on delete cascade,
 version integer not null check(version>0),
 storage_path text not null,
 generated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(report_id,version)
);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.academic_periods enable row level security;
alter table public.students enable row level security;
alter table public.parent_students enable row level security;
alter table public.assessment_components enable row level security;
alter table public.student_reports enable row level security;
alter table public.weekly_assessments enable row level security;
alter table public.weekly_assessment_scores enable row level security;
alter table public.report_summaries enable row level security;
alter table public.generated_reports enable row level security;

create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_user_role() in ('admin','teacher'),false) $$;

create policy "read own profile or admin" on public.profiles for select to authenticated
using(id=auth.uid() or public.current_user_role()='admin');
create policy "admin manages profiles" on public.profiles for all to authenticated
using(public.current_user_role()='admin') with check(public.current_user_role()='admin');

create policy "staff read classes" on public.classes for select to authenticated using(public.is_staff());
create policy "admin manages classes" on public.classes for all to authenticated
using(public.current_user_role()='admin') with check(public.current_user_role()='admin');
create policy "authenticated read periods" on public.academic_periods for select to authenticated using(true);
create policy "admin manages periods" on public.academic_periods for all to authenticated
using(public.current_user_role()='admin') with check(public.current_user_role()='admin');

create policy "staff manage students" on public.students for all to authenticated
using(public.is_staff()) with check(public.is_staff());
create policy "parents read linked students" on public.students for select to authenticated
using(exists(select 1 from public.parent_students ps where ps.student_id=id and ps.parent_id=auth.uid()));
create policy "staff manage parent links" on public.parent_students for all to authenticated
using(public.is_staff()) with check(public.is_staff());
create policy "parent read own links" on public.parent_students for select to authenticated
using(parent_id=auth.uid());
create policy "read components" on public.assessment_components for select to authenticated using(true);

create policy "staff manage reports" on public.student_reports for all to authenticated
using(public.is_staff()) with check(public.is_staff());
create policy "parent read published reports" on public.student_reports for select to authenticated
using(status='published' and exists(select 1 from public.parent_students ps where ps.student_id=student_id and ps.parent_id=auth.uid()));

create policy "staff manage weekly assessments" on public.weekly_assessments for all to authenticated
using(public.is_staff()) with check(public.is_staff());
create policy "parent read weekly assessments" on public.weekly_assessments for select to authenticated
using(exists(select 1 from public.student_reports r join public.parent_students p on p.student_id=r.student_id where r.id=report_id and r.status='published' and p.parent_id=auth.uid()));

create policy "staff manage scores" on public.weekly_assessment_scores for all to authenticated
using(public.is_staff()) with check(public.is_staff());
create policy "parent read scores" on public.weekly_assessment_scores for select to authenticated
using(exists(select 1 from public.weekly_assessments w join public.student_reports r on r.id=w.report_id join public.parent_students p on p.student_id=r.student_id where w.id=weekly_assessment_id and r.status='published' and p.parent_id=auth.uid()));

create policy "staff manage summaries" on public.report_summaries for all to authenticated
using(public.is_staff()) with check(public.is_staff());
create policy "parent read summaries" on public.report_summaries for select to authenticated
using(exists(select 1 from public.student_reports r join public.parent_students p on p.student_id=r.student_id where r.id=report_id and r.status='published' and p.parent_id=auth.uid()));

create policy "staff manage generated reports" on public.generated_reports for all to authenticated
using(public.is_staff()) with check(public.is_staff());
create policy "parent read generated report metadata" on public.generated_reports for select to authenticated
using(exists(select 1 from public.student_reports r join public.parent_students p on p.student_id=r.student_id where r.id=report_id and r.status='published' and p.parent_id=auth.uid()));
