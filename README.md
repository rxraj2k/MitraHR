# MitraHR

A self-hosted HRMS + Project/Client Management platform built for Offshore Mitra. Started as a bare-bones login/dashboard shell (Sprint 0) and has since grown into a full internal system covering the employee lifecycle, project staffing, recruitment, performance, and company-wide reporting.

This README reflects the application as it stands today, not just the original scaffold — see [Feature Overview](#feature-overview) below for the current module list.

## Tech Stack

- **Backend:** NestJS + TypeScript, Prisma ORM, JWT auth (via Passport)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS, Recharts for charts, jsPDF + html2canvas for PDF export
- **Database:** SQLite (a single local file, zero install) — the schema is written to make a future move to PostgreSQL a small, well-defined change (swap the Prisma `provider` and `DATABASE_URL`, re-run migrations), not a rewrite
- **Email:** SMTP via Nodemailer (configured for Zoho Mail), with a "console" mode that logs OTP/invite emails to the terminal instead of sending real email — handy for local development without mail credentials

## Who Uses This

MitraHR has two ways of signing in:

- **Staff accounts** (password login) — Administrator, HR, Manager, or IT Support. These roles get the full admin-facing app: Master Data, Reports, Admin Center (Administrator only), and write access to most modules.
- **Employee accounts** (OTP login, no password) — every employee gets read-only, self-service access to their own information: My Space, My Leave, My Learning, My Performance, the org directory, and so on, without needing a staff login.

## Feature Overview

**Home Dashboard** — Role-aware landing page. Staff see a KPI summary bar (headcount, projects, leave, assets, training, recruitment) across five analytics tabs (Overview, Workforce Analytics, Leave & Attendance, Project Allocation, Recruitment); every employee sees their own projects, assets, and documents, plus company announcements and upcoming birthdays.

**Employee Management** — Talent Directory (CRUD, profiles, photos, documents, skills matrix), an onboarding wizard, Team Topology (interactive org chart), and Exit & Clearance workflows for offboarding.

**Leaves & Attendance** — Leave requests/approvals, attendance tracking and calendars, comp-off tracking, leave attachments, and a "today at a glance" view — both an admin-facing view (`Leaves & Attendance`) and a self-service one (`My Leave`).

**Projects & Clients** — Client Management, Project Management (with mentors, category, and technology tagging), Bench & Utilization reporting, and a Staffing Sandbox for planning allocations before committing them.

**Recruitment (ATS)** — A full applicant-tracking pipeline: a drag-and-drop Kanban board across eight stages (Applied → Screening → Technical → Final → HR Round → Offer → Hired / Rejected), per-round interview notes and star ratings, candidate sourcing, resume storage, and a Role/Track tag (DevOps, IAM, Cyber Security, AI Intern, AI Engineer, etc.) independent of the formal job requisition. Includes a one-time import of the team's historical Zoho Sheet interview tracker.

**Performance & Goals** — Review cycles, self/manager/peer ratings, goal tracking, and a self-service view (`My Performance`) for employees to track their own progress.

**Engagement & Feedback** — Peer recognition/kudos, plus **Office Wall**, a lightweight social space with live presence ("N Online").

**Learning Center** — A training catalog, course assignment, quizzes/assessments, and a self-service `My Learning` view.

**Asset Management** — IT/physical asset inventory, assignment and return tracking, and condition-at-handoff notes.

**Document Management** — Company-wide document storage (policies, announcements) and per-employee document records with expiry tracking.

**Reports & Analytics** — Attendance ledgers, tenure & mobility, the ATS/Recruitment Funnel, compliance/asset rosters, leave utilization, hours & overtime, appraisal cycle status, and Office Wall engagement — every tab exportable as CSV, Excel (`.xls`), or a PDF report.

**Master Data** (Settings) — The managed lookup lists the rest of the app draws from: Organization structure, Skills, Appraisal Criteria, Technologies, Training Catalog, Assessments, Clients & Hiring (Contract Types, Candidate Sources, Role Tracks), Leave Policy, Assets & Docs, and Locations.

**Admin Center** — Administrator-only: system-wide settings and controls not exposed elsewhere.

**Self-service spaces** — `My Space` (personal overview, attendance & leave, approvals & documents, performance), `My Team` (for managers: direct reports, team attendance approvals, team topology), and an `Organization` space (company overview, directory, department tree, announcements & policies, birthdays, new hires).

## Project Structure

```
MitraHR/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── prisma/   # schema.prisma, migrations, seed scripts
│   │   └── src/      # one module per feature area (employees, recruitment, reports, ...)
│   └── web/          # React + Vite frontend
│       └── src/
│           ├── pages/       # one folder per feature area, mirrors the API modules
│           ├── components/  # shared UI (dashboard widgets, lookup managers, icons, ...)
│           └── lib/api.ts   # typed fetch wrappers for every backend endpoint
└── README.md
```

## Getting Started

### One-time setup

From the `MitraHR` folder:

```bash
npm install
```

This installs both the API and the web app in one go (npm workspaces).

#### Backend

```bash
cd apps/api
cp .env.example .env
npx prisma migrate dev
npm run seed
```

This creates the local database file and seeds one admin login:

- **Email:** `admin@mitrahr.local`
- **Password:** `ChangeMe123!`

Change this password once you're logged in. A few optional seed scripts exist for specific modules (`npm run seed:recruitment`, `seed:performance`, `seed:engagement`, and a couple of one-off data-fix scripts) — run them only if you need that module's sample data.

#### Frontend

```bash
cd apps/web
npm run dev
```

No extra setup needed — it already points at `http://localhost:4000` for the API by default.

### Running it

Open two terminal tabs:

```bash
# Terminal 1
cd apps/api && npm run dev
```

```bash
# Terminal 2
cd apps/web && npm run dev
```

Then open **http://localhost:5173** and log in with the admin credentials above.

This two-server setup (API on 4000, frontend on 5173) is standard for local development — the two run and hot-reload independently. It's only worth collapsing into a single address when this is deployed somewhere for real use (see below).

## Environment Variables (`apps/api/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path (defaults to `file:./dev.db`) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Auth token signing |
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Allowed frontend origin (default `http://localhost:5173`) |
| `EMAIL_PROVIDER` | `console` (logs emails to the terminal) or `smtp` (sends real email) |
| `SMTP_*` / `MAIL_FROM` | Required only when `EMAIL_PROVIDER=smtp` |
| `APP_URL` | Used to build links inside emails (invites, appraisal notifications) |

**Before deploying anywhere real:** set `CORS_ORIGIN` and `APP_URL` to the app's actual public URL — left on `localhost`, every emailed link will be unreachable and the browser will reject the real frontend's API requests.

## Current State

This is an actively evolving internal build, not a finished product — modules are added and refined sprint by sprint. The two-port local setup, SQLite database, and console-mode email are all intentional development-time choices with a clear, documented path to production equivalents (PostgreSQL, a single deployed origin, real SMTP) when the time comes.
