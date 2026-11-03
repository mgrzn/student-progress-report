# Student Progress Report

A web-based student progress reporting platform designed to help educational institutions manage student assessments, monitor learning development, and generate structured progress reports.

The application provides separate dashboards for administrators, teachers, and parents, making student assessment and reporting more organized, accessible, and efficient.

## Features

### 1. Role-Based Access

The platform supports three user roles:

- **Admin** — Manages users, students, classes, academic periods, and report administration.
- **Teacher** — Manages weekly assessments, student progress notes, final learning descriptions, and report generation.
- **Parent** — Views published student progress reports and downloads the latest PDF version for their linked children.

### 2. Student Management
- Create and manage student records.
- Assign students to classes.
- Manage student information and profile photos.

### 3. Academic Management
- Manage academic years and semesters.
- Configure the number of assessment weeks.
- Set and manage active academic periods.

### 4. Weekly Assessments

Teachers can record student progress through three learning components:

Features include:
- Weekly scores for each learning component.
- Four assessment weeks per month.
- Monthly progress notes.
- Automatic average calculation for each component.

### 5. Progress Reports

- Automatically calculate average scores for each learning component.
- Add final descriptions for CL1, CL2, and CL3.
- Generate individual student reports in PDF format.
- Support report versioning when PDFs are regenerated.
- Include student information, weekly assessments, progress notes, charts, and instructor signatures.
- Track PDF freshness to prevent publishing outdated reports.

### 6. Parent Portal
- View linked children.
- Access published progress reports.
- Download the latest published PDF report.

### 7. Report Workflow

The report workflow consists of:

1. Teachers enter weekly student assessments.
2. Teachers complete final learning descriptions.
3. The system calculates component averages.
4. Teachers generate the PDF report.
5. Teachers publish the report.
6. Parents can view and download the published report.

## Tech Stack

### Frontend
- **Next.js 14** — React framework with App Router.
- **React 18** — Component-based user interface.
- **TypeScript** — Static typing and maintainable code.
- **Tailwind CSS** — Responsive UI styling.

### Backend & Database
- **Supabase** — Backend platform.
- **PostgreSQL** — Relational database.
- **Supabase Auth** — User authentication.
- **Supabase Storage** — PDF reports, student photos, and signature storage.
- **Row Level Security (RLS)** — Database access control.

### Deployment
- **Vercel** — Application hosting and deployment.
- **GitHub** — Source code management and version control.

## Project Structure

```text
student-progress-report/
├── app/
│   ├── components/
│   │   ├── NotificationProvider.tsx
│   │   ├── PortalSidebar.tsx
│   │   └── ReportNotifications.tsx
│   ├── dashboard/
│   │   ├── assessments/
│   │   ├── classes/
│   │   ├── periods/
│   │   ├── reports/
│   │   ├── students/
│   │   ├── users/
│   │   └── sidebar.tsx
│   ├── parent/
│   ├── teacher/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase/
├── public/
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

*Note: The structure above represents the main application areas. Actual files may vary depending on the latest implementation.*

## Getting Started

### Requirements

- Node.js 18.17 or later.
- npm.
- Supabase project.

### Installation

Clone the repository:

```bash
git clone YOUR_REPOSITORY_URL
cd student-progress-report
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Use your own Supabase credentials. Never expose the service role key in client-side code or commit it to a public repository.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

## Deployment

The application can be deployed using Vercel.

1. Push the project repository to GitHub.
2. Import the repository into Vercel.
3. Configure the required environment variables.
4. Deploy the application.

## Security

- Role-based access control.
- Supabase Row Level Security policies.
- Server-side handling of privileged operations.
- Environment variables for sensitive credentials.

---

**Student Progress Report**  
A centralized platform for managing student assessments and academic progress reporting.



