# DCL Lugazi ERP — Church Management System

**Repository:** `Lugazi-system`
**Owner:** levixticus67-lab
**Live API:** Hosted on Render
**Live App:** Hosted on Firebase

---

## 📖 Table of Contents

1. [What Is This Project?](#what-is-this-project-for-non-technical-readers)
2. [Who Uses It (User Roles & Portals)](#who-uses-it-user-roles--portals)
3. [Feature Walkthrough](#feature-walkthrough)
4. [How a Person's Journey Looks](#how-a-persons-journey-flows-through-the-system)
5. [Technical Architecture](#technical-architecture-for-developers)
6. [Project Structure](#project-structure)
7. [Tech Stack](#tech-stack)
8. [Environment Variables](#environment-variables)
9. [Running Locally](#running-locally)
10. [Deployment](#deployment)
11. [Database](#database)
12. [Glossary](#glossary-of-terms)

---

## What Is This Project? (For Non-Technical Readers)

**DCL Lugazi ERP** is a complete digital management system for DCL Lugazi church. Think of it as the church's "operating system" — it replaces paper registers, spreadsheets, and WhatsApp groups with one organized, secure, web-based application that works both as a website and as an installable mobile app (a PWA — see [Glossary](#glossary-of-terms)).

It manages everything from the moment a visitor walks through the door, to their growth into a committed member, to their service as a leader — plus all the day-to-day church operations: finances, events, communication, attendance, and more.

It is built with **five separate portals** — one for each type of user — so each person only sees the tools relevant to their role, with no clutter and no confusion.

---

## Who Uses It (User Roles & Portals)

| Portal | Who it's for | What they can do |
|---|---|---|
| **Admin** | Church administrators / IT managers | Full control — manage everyone and everything below |
| **Pastor** | Senior pastors | Oversight dashboards, attendance trends, reports |
| **Leadership** | Department heads, cell leaders, ministry leaders | Manage their teams, cell groups, events, finances, approvals |
| **Workforce** | General staff / volunteers | Day-to-day operational tools: tasks, attendance, duty roster |
| **Member** | Regular church members | Personal profile, giving, events, sermons, prayer requests |

Every user logs in with one account, and the system automatically shows them the correct portal based on their assigned role.

---

## Feature Walkthrough

### 🧑‍🤝‍🧑 People Management

- **Members** — the full church register: names, contact info, branch, cell group, family relationships, QR code ID cards
- **Family Members** — link spouses, children, and dependents to a member's profile
- **Users & Roles** — controls who can log in and what role/permissions they have (admin, pastor, leadership, workforce, member)
- **Branches** — for churches operating multiple physical locations

### 🌱 Growth & Outreach (the two features that often get confused — see below for the difference)

- **Pipeline** — tracks **visitors and prospects** who are NOT yet members. A staff member is assigned to follow up with them through stages (e.g. New Contact → Following Up → Joined) until they decide to become a full member.
- **Induction & Growth** — tracks **existing members** as they go through structured discipleship courses ("tracks") such as Foundation Class, Growth Track, and Leadership Training. Each member's session progress (0–100%) and completion status is recorded.

  > **Simple way to remember it:** Pipeline = getting people *into* the church. Induction = growing people *within* the church.

### 👥 Groups & Teams

- **Cell Fellowship / Groups** — small home/cell groups members belong to, with leaders and meeting schedules
- **Ministry Teams** — service teams (ushering, choir, media, etc.) with leaders and members
- **Meetings** — scheduling and minutes for leadership/team meetings

### 📅 Events & Engagement

- **Events** — create and manage church events (services, conferences, outreach) with RSVPs
- **Attendance** — record who attended a service, event, or cell meeting, with QR-code check-in support
- **Duty Roster** — schedule who is serving on which date/role (e.g. ushering, sound, security)

### 💰 Finance & Giving

- **Finance** — church income/expense tracking, budget oversight (leadership/admin only)
- **Giving** — record and view member tithes, offerings, and special contributions
- **Welfare** — manage welfare fund requests and support given to members in need

### 📣 Communication

- **Announcements** — broadcast messages to all members or specific groups
- **Chat / LiveChat** — in-app messaging
- **AI Assistant** — a built-in AI helper (floating button on every page) that gives contextual suggestions based on the page you're viewing
- **Prayer Requests** — members submit prayer requests; leadership can follow up
- **Testimonies** — members share testimonies for the church to celebrate

### 🎙 Media & Content

- **Sermons** — upload/stream sermon recordings
- **Media** — photo and video galleries from church events
- **Documents** — shared file repository (policies, forms, certificates)

### ✅ Operations

- **Tasks** — assign and track to-do items across departments
- **Reports** — generated insights and statistics across attendance, giving, growth, etc.
- **Activity Logs** — an audit trail of important actions taken in the system (who did what, when)
- **Role Requests** — members can request a role change (e.g. apply to become a workforce member), subject to approval
- **Settings** — system-wide configuration (admin only)

### 👤 Personal (every member has access to)
- **Profile** — personal information and account settings
- **QR Code** — a personal QR code used for fast check-in at events/attendance
- **Upgrade** — request to upgrade membership tier/role

---

## How a Person's Journey Flows Through the System

```
 VISITOR                MEMBER                    GROWING MEMBER             LEADER
   │                       │                            │                      │
   ▼                       ▼                            ▼                      ▼
┌─────────┐         ┌─────────────┐           ┌──────────────────┐    ┌───────────────┐
│ PIPELINE │ ──────▶ │   MEMBERS   │ ────────▶ │ INDUCTION TRACKS │ ──▶ │ MINISTRY TEAM /│
│(prospect)│  joins  │ (registered)│  enrolled │ (Foundation →    │     │ CELL LEADERSHIP│
└─────────┘         └─────────────┘           │  Growth →        │    └───────────────┘
                                                │  Leadership)      │
                                                └──────────────────┘
```

Along the way, the system also tracks their **attendance**, **giving**, **events** they join, and any **welfare support** they may need — building a complete picture of every person's relationship with the church.

---

## Technical Architecture (For Developers)

This is a **pnpm monorepo** with a clear separation between the API server and the frontend client, sharing common code (database schema, validation, types) through internal libraries.

```
┌──────────────────────┐        HTTPS / REST API        ┌────────────────────────┐
│   Frontend (Lugazi)   │ ◀─────────────────────────────▶ │   API Server (Express) │
│  React + Vite + PWA   │                                 │  Node.js + Express 5   │
│  Hosted on Firebase   │                                 │   Hosted on Render     │
└──────────────────────┘                                 └────────────┬───────────┘
                                                                       │
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │   PostgreSQL (Neon) │
                                                            │   via Drizzle ORM   │
                                                            └────────────────────┘
```

- The **frontend** is a single React app that renders different navigation/pages depending on the logged-in user's role (`admin`, `pastor`, `leadership`, `workforce`, `member`), using a shared `PortalLayout` component.
- The **backend** exposes a REST API; each domain (members, events, finance, induction, pipeline, etc.) has its own route file in `artifacts/api-server/src/routes/`.
- The **database** is PostgreSQL, defined with Drizzle ORM schemas in `lib/db/src/schema/` — one schema file per domain, mirroring the route files.
- Validation is shared between frontend and backend using Zod schemas generated from the Drizzle table definitions (`drizzle-zod`).
- The app is also installable as a **PWA (Progressive Web App)** — when installed on a phone, it behaves like a native app (own icon, full-screen, works offline for cached content) without needing an App Store.

---

## Project Structure

```
Lugazi-system/
├── .github/workflows/          # CI/CD automation
│   ├── deploy-firebase.yml     #  → builds & deploys the frontend to Firebase Hosting
│   ├── migrate-neon.yml        #  → runs database migrations against the Neon Postgres DB
│   └── keep-alive.yml          #  → pings the Render API periodically to prevent cold-start sleep
│
├── artifacts/
│   ├── lugazi/                 # Frontend — React + Vite app (the church-facing website/PWA)
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── admin/      # Admin portal pages
│   │       │   ├── pastor/     # Pastor portal pages
│   │       │   ├── leadership/ # Leadership portal pages
│   │       │   ├── workforce/  # Workforce portal pages
│   │       │   └── member/     # Member portal pages
│   │       ├── components/     # Shared UI components (PortalLayout, AIAssistant, LiveChat, etc.)
│   │       └── hooks/          # Shared React hooks (e.g. PWA detection)
│   │
│   ├── api-server/             # Backend — Express REST API
│   │   └── src/
│   │       ├── routes/         # One file per feature/domain (members.ts, events.ts, induction.ts...)
│   │       └── middlewares/    # Auth & role-based access control
│   │
│   └── mockup-sandbox/         # Internal design/prototyping sandbox (not part of the live product)
│
├── lib/
│   └── db/                     # Shared database package
│       └── src/schema/         # Drizzle ORM table definitions (one file per domain)
│
├── scripts/                    # Utility/maintenance scripts
├── pnpm-workspace.yaml         # Monorepo workspace configuration
└── package.json                # Root-level scripts (build, typecheck)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo tooling | pnpm workspaces, Node.js |
| Language | TypeScript (strict mode) |
| Frontend framework | React 18 + Vite |
| Frontend styling | Tailwind CSS + Radix UI components |
| Frontend routing | Wouter |
| Frontend data fetching | TanStack React Query + Axios |
| Mobile app shell | Capacitor (for native Android packaging) + PWA support |
| Backend framework | Express 5 (Node.js) |
| Database | PostgreSQL (hosted on Neon) |
| ORM | Drizzle ORM |
| Validation | Zod (`drizzle-zod` for auto-generated schemas) |
| Authentication | JWT (JSON Web Tokens) + bcrypt password hashing |
| File/media storage | Cloudinary |
| Email | Nodemailer |
| Logging | Pino |
| CI/CD | GitHub Actions |
| Frontend hosting | Firebase Hosting |
| Backend hosting | Render |

---

## Environment Variables

These are required for the API server to run (set as secrets in Render and GitHub Actions — never commit actual values to the repository):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Signing key for authentication tokens |
| `CLOUDINARY_URL` / Cloudinary keys | Media upload storage |
| `SMTP_*` (or Nodemailer config) | Sending system emails (password resets, notifications) |
| Firebase project credentials | Used by the GitHub Action to deploy the frontend |

---

## Running Locally

```bash
# 1. Install dependencies (always use pnpm, not npm or yarn)
pnpm install

# 2. Run the API server (default port 5001 in dev)
pnpm --filter @workspace/api-server run dev

# 3. Run the frontend (in a separate terminal)
pnpm --filter @workspace/lugazi run dev

# 4. Typecheck everything before committing
pnpm run typecheck

# 5. Push database schema changes (development only)
pnpm --filter @workspace/db run push
```

---

## Deployment

Deployment is fully automated via **GitHub Actions**:

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-firebase.yml` | Push to `main` | Builds the frontend and deploys it to Firebase Hosting |
| `migrate-neon.yml` | Push to `main` (when DB schema changes) | Applies database migrations to the live Neon Postgres database |
| `keep-alive.yml` | Scheduled (cron) | Pings the Render-hosted API periodically so it doesn't go to sleep on the free tier |

The **API server** itself is deployed on **Render**, which automatically redeploys when changes are pushed to the connected branch.

---

## Database

The database is **PostgreSQL**, hosted on **Neon** (a serverless Postgres provider), accessed through **Drizzle ORM**.

Each feature/domain has a matching pair of files:
- `lib/db/src/schema/<domain>.ts` — defines the database table structure
- `artifacts/api-server/src/routes/<domain>.ts` — defines the API endpoints for that table

For example: `induction.ts` exists in both the schema folder (defines the `induction_tracks` and `induction_enrollments` tables) and the routes folder (defines the API endpoints to create, read, update, and delete that data).

---

## Glossary of Terms

For readers who aren't familiar with technical terms used above:

- **PWA (Progressive Web App):** A website that can be "installed" on a phone or computer like a regular app, complete with its own icon, and can work without an internet connection for previously-loaded content.
- **API (Application Programming Interface):** The "messenger" that lets the frontend (what you see) talk to the backend (where data is stored and processed).
- **Backend:** The server-side part of the system that stores data, applies business rules, and enforces security — invisible to the user.
- **Frontend:** The part of the system you actually see and interact with in your browser or app.
- **Database:** Where all the church's data (members, finances, events, etc.) is permanently stored.
- **ORM (Object-Relational Mapper):** A tool (Drizzle, in this case) that lets developers work with the database using regular code instead of writing raw database queries.
- **Repository ("repo"):** The project's full set of code and history, stored on GitHub.
- **Monorepo:** A single repository containing multiple related projects (here: the frontend app, the backend server, and shared code) instead of separate repositories for each.
- **CI/CD (Continuous Integration/Continuous Deployment):** Automated processes (GitHub Actions, in this case) that test and deploy the app automatically whenever code is updated.
- **JWT (JSON Web Token):** A secure digital "ticket" issued when a user logs in, proving who they are on every subsequent request without needing to log in again.
- **Role-Based Access:** A system where what you can see and do depends on your assigned role (admin, pastor, leadership, workforce, or member).

---

*This README was generated to give both developers and non-technical stakeholders (e.g. church leadership, clients) a complete understanding of the DCL Lugazi ERP system.*
