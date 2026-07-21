# DCL Lugazi ERP — Church Management System

**Repository:** `Lugazi-system`
**Owner:** levixticus67-lab
**Live API:** Hosted on Render
**Live App:** Hosted on Firebase Hosting
**Android App:** Built by Codemagic, distributed via GitHub Releases

---

## 📖 Table of Contents

1. [What Is This Project?](#what-is-this-project)
2. [User Roles & Portals](#user-roles--portals)
3. [Feature Walkthrough](#feature-walkthrough)
4. [How a Person's Journey Flows Through the System](#how-a-persons-journey-flows-through-the-system)
5. [Architecture](#architecture)
6. [Project Structure](#project-structure)
7. [Tech Stack](#tech-stack)
8. [Database Schema](#database-schema)
9. [API Routes](#api-routes)
10. [Authentication & Security](#authentication--security)
11. [AI Assistant](#ai-assistant)
12. [Push Notifications](#push-notifications)
13. [Android Build Pipeline (Codemagic)](#android-build-pipeline-codemagic)
14. [CI/CD (GitHub Actions)](#cicd-github-actions)
15. [Environment Variables](#environment-variables)
16. [Running Locally](#running-locally)
17. [Deployment](#deployment)
18. [Glossary](#glossary)

---

## What Is This Project?

**DCL Lugazi ERP** is a complete digital management system for Deliverance Church Lugazi (The House of Kingdom Giants), Uganda. It replaces paper registers, spreadsheets, and WhatsApp groups with one secure, role-aware web application that also ships as an installable Android APK (via Capacitor + Codemagic) and a PWA for iOS/desktop.

It manages the full lifecycle of a person at the church — from their first visit as a prospect, through membership registration, discipleship growth tracks, and into leadership service — alongside all day-to-day church operations: attendance, finance, events, welfare, communication, and more.

---

## User Roles & Portals

Each user is assigned exactly one role. The app reads that role at login and renders the correct portal — other portals are never visible.

| Role | Portal | Who it's for | What they can do |
|---|---|---|---|
| `admin` | Admin | Church administrators / IT | Full system access — every feature, every record |
| `pastor` | Pastor | Senior pastors | Oversight dashboards, attendance trends, reports, all data read-only |
| `leadership` | Leadership | Dept heads, cell leaders, ministry leaders | Manage their teams, events, finances, approvals |
| `workforce` | Workforce | Staff and volunteers | Day-to-day ops — tasks, attendance marking, duty roster |
| `member` | Member | Regular church members | Personal profile, giving history, events, sermons, prayer requests |

Roles are enforced both in the API (`requireRole` middleware) and in the frontend router. Role upgrades go through a formal request → admin approval workflow.

---

## Feature Walkthrough

### 🧑‍🤝‍🧑 People Management

- **Members** — full church register: name, contact info, branch, cell group, family links, profession, birthday, photo, QR-code ID card
- **Family Members** — link spouses, children, and dependents to a member's profile
- **Users** — login accounts with role assignment and active/inactive status; separate from member profiles but linkable via `userId`
- **Branches** — manage multiple physical church locations; members and groups are branch-scoped
- **Role Requests** — members apply for a role upgrade; admins approve or reject with a note; 24-hour rejection cooldown prevents spam resubmission

### 🌱 Growth & Outreach

> **Pipeline vs Induction — the key distinction:**
> - **Pipeline** = getting people *into* the church (visitors and prospects not yet members)
> - **Induction** = growing people *within* the church (existing members through discipleship tracks)

- **Pipeline** — tracks visitors/prospects through configurable stages (New Contact → Following Up → Joined). Each prospect has an assigned staff follow-up person, source, branch, notes, and a `lastContactedAt` timestamp.
- **Induction & Growth Tracks** — structured discipleship courses (Foundation Class, Growth Track, Leadership Training, etc.). Each track has a name, level, and total sessions. Enrollments record a member's `progress` (0–100%) and `status` (enrolled / completed).

### 👥 Groups & Teams

- **Cell Fellowship / Groups** — small home/cell groups with type (`cell` or other), leaders, and meeting schedules
- **Ministry Teams** — service teams (ushering, choir, media, security, etc.) with members and team leaders
- **Meetings** — schedule and record minutes for leadership and team meetings; scoped by `portalTarget` role

### 📅 Events & Engagement

- **Events** — create and manage church events (services, conferences, outreach) with date, time, location, category, and RSVP support
- **Attendance** — record who attended a service, event, or cell meeting; supports both manual entry and QR-code check-in (via `jsqr`)
- **Duty Roster** — schedule who serves on which date and role (ushering, sound, security, etc.)

### 💰 Finance & Giving

- **Finance (Transactions)** — full income/expense ledger in UGX; each transaction has type, amount, category, description, branch, and the user who recorded it. Restricted to leadership and above.
- **Giving (Contributions)** — separate record of member tithes, offerings, and special contributions. Restricted to leadership and above. Includes a summary endpoint grouped by contribution type.
- **Welfare** — manage welfare fund requests: members in need submit a request (category, description, amount requested); admins review, approve/reject with a note.

### 📣 Communication

- **Announcements** — broadcast messages to all members or specific groups
- **Chat / Live Chat** — in-app group and private messaging with message reactions, online status (`online` / `offline` / `in-service` / `dnd`), and per-user rate limiting (20 messages/minute)
- **AI Assistant** — a floating Gemini-powered AI helper on every page; understands church context (Uganda, DCL Lugazi domain), falls back across three Gemini models (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite`), and enforces a 10-request/minute per-user rate limit
- **Prayer Requests** — members submit prayer requests; leadership can view, follow up, and mark as answered
- **Testimonies** — members share testimonies for the church community to celebrate

### 🎙 Media & Content

- **Sermons** — upload and stream sermon recordings
- **Media** — photo and video galleries from church events; uploads go directly to Cloudinary via a signed upload signature from the API (no file passes through the server)
- **Documents** — shared file repository for policies, forms, and certificates

### ✅ Operations

- **Tasks** — create and assign to-do items to users; each task has a due date, priority, and status (`pending` / `in_progress` / `done`)
- **Reports** — generated insights across attendance, giving, growth, and more
- **Activity Logs** — full audit trail: every significant action (create, update, delete, QR check-in, role request, password reset, etc.) is logged with user, timestamp, entity, and IP address
- **Settings** — system-wide configuration (admin only)

### 🔔 Notifications

- **In-App Notifications** — real-time bell icon alerts (role request decisions, task assignments, etc.); delivered both as in-app records and as FCM push notifications to mobile devices
- **Push Notifications** — two separate systems: live FCM server-pushed alerts and scheduled local device reminders (see [Push Notifications](#push-notifications))

### 👤 Personal (all members)

- **Profile** — personal information, profile photo (Cloudinary), and account settings
- **QR Code** — personal QR code (`qrToken`) used for fast event/attendance check-in
- **Upgrade** — request a role upgrade via the Role Requests workflow

---

## How a Person's Journey Flows Through the System

```
 VISITOR                MEMBER                    GROWING MEMBER             LEADER
   │                       │                            │                      │
   ▼                       ▼                            ▼                      ▼
┌─────────┐         ┌─────────────┐           ┌──────────────────┐    ┌───────────────────┐
│ PIPELINE │ ──────▶ │   MEMBERS   │ ────────▶ │ INDUCTION TRACKS │ ──▶ │ MINISTRY TEAM /   │
│(prospect)│  joins  │ (registered)│  enrolled │ (Foundation →    │     │ CELL LEADERSHIP   │
└─────────┘         └─────────────┘           │  Growth →        │    └───────────────────┘
                                               │  Leadership)      │
                                               └──────────────────┘
```

Along the way the system records their **attendance**, **giving**, **events** they join, **welfare** support received, and any **tasks** they are assigned — building a complete picture of every person's relationship with the church.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                               │
│                                                                │
│  ┌─────────────────────────────────────┐  ┌─────────────────┐ │
│  │   React + Vite PWA (Firebase CDN)   │  │  Android APK    │ │
│  │   artifacts/lugazi/                 │  │  (Codemagic)    │ │
│  └────────────────────┬────────────────┘  └────────┬────────┘ │
│                       │ HTTPS REST API              │          │
└───────────────────────┼─────────────────────────────┼──────────┘
                        ▼                             ▼
             ┌──────────────────────────────────────────────┐
             │          API SERVER (Render)                  │
             │   artifacts/api-server/   Node.js + Express 5 │
             │                                               │
             │  • JWT auth (HttpOnly cookie + Bearer header) │
             │  • Role-based middleware                      │
             │  • Rate limiting (auth: 5/15min, API:         │
             │    1000/15min, AI: 10/min, Chat: 20/min)      │
             │  • Security headers (HSTS, CSP, X-Frame etc.) │
             │  • FCM background worker (30s interval)       │
             │  • esbuild CJS bundle via build.mjs           │
             └──────────────────┬───────────────────────────┘
                                │
                                ▼
             ┌──────────────────────────────┐
             │   PostgreSQL on Neon          │
             │   lib/db/   Drizzle ORM       │
             │   Schema pushed via drizzle-kit│
             └──────────────────────────────┘
```

### Monorepo Layout

The project is a **pnpm workspace** with three types of packages:

| Package type | Location | Purpose |
|---|---|---|
| **Artifacts** | `artifacts/*` | Deployable apps (frontend, API server) |
| **Shared libs** | `lib/*` | Consumed by artifacts — DB schema, API client, Zod types |
| **Scripts** | `scripts/` | One-off utility scripts |

Libs are TypeScript composite packages (`tsc --build`). Artifacts are leaf packages typechecked with `tsc --noEmit`. Artifacts never import from each other — only from `lib/*`.

---

## Project Structure

```
Lugazi-system/
├── .github/workflows/
│   ├── deploy-firebase.yml        # Build & deploy frontend → Firebase on push to main
│   ├── migrate-neon.yml           # Push DB schema changes → Neon on schema file change
│   └── trigger-codemagic.yml     # Trigger Codemagic Android APK build on push to main
│
├── artifacts/
│   ├── lugazi/                    # Frontend — React + Vite PWA
│   │   ├── capacitor.config.ts    # Capacitor config (appId: com.dclugazi.church)
│   │   ├── firebase.json          # Firebase Hosting config (site: lugazi-system1)
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── admin/         # Admin portal pages
│   │       │   ├── pastor/        # Pastor portal pages
│   │       │   ├── leadership/    # Leadership portal pages
│   │       │   ├── workforce/     # Workforce portal pages
│   │       │   └── member/        # Member portal pages
│   │       ├── components/        # Shared UI (NotificationBell, PushNotifications,
│   │       │                      #   InAppNotifications, AIAssistant, LiveChat, etc.)
│   │       ├── services/
│   │       │   └── notificationScheduler.ts  # Scheduled local push notifications
│   │       └── contexts/          # AuthContext and other React context providers
│   │
│   └── api-server/                # Backend — Express 5 REST API
│       ├── build.mjs              # esbuild bundle script (outputs dist/index.mjs)
│       └── src/
│           ├── app.ts             # Express setup: CORS, rate limiting, security headers
│           ├── index.ts           # Server entry point (binds port, starts FCM worker)
│           ├── lib/
│           │   ├── fcm.ts         # Firebase Admin FCM push worker (30s poll)
│           │   ├── activityLog.ts # Shared activity log helper
│           │   └── logger.ts      # Pino logger singleton
│           ├── middlewares/
│           │   └── auth.ts        # requireAuth, requireRole, generateToken
│           └── routes/            # One file per domain (35+ route modules)
│
├── lib/
│   ├── db/                        # Shared database package
│   │   ├── drizzle.config.ts      # Drizzle Kit config (reads DATABASE_URL)
│   │   └── src/schema/            # One schema file per domain (30+ tables)
│   ├── api-client-react/          # Generated React Query hooks (from OpenAPI via Orval)
│   ├── api-zod/                   # Generated Zod schemas (from OpenAPI via Orval)
│   └── api-spec/                  # OpenAPI spec + Orval codegen config
│
├── scripts/                       # Utility/maintenance scripts
├── codemagic.yaml                 # Codemagic Android build pipeline config
├── pnpm-workspace.yaml            # Workspace packages, catalog versions, overrides
├── .npmrc                         # minimumReleaseAge: 1440 (supply-chain protection)
└── tsconfig.json                  # Root solution file for composite lib packages
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Monorepo | pnpm workspaces, Node.js 24 | Catalog-pinned dependencies |
| Language | TypeScript 5 (strict) | Full type coverage across all packages |
| Frontend framework | React 19 + Vite 7 | PWA via `vite-plugin-pwa` |
| Frontend styling | Tailwind CSS v4 + Radix UI | Full Shadcn/ui component library |
| Frontend routing | Wouter | Lightweight client-side router |
| Frontend data fetching | TanStack React Query v5 + Axios | Generated hooks via Orval from OpenAPI spec |
| Animations | Framer Motion | Page transitions and micro-interactions |
| Charts | Recharts | Used in dashboard and report pages |
| Mobile (Android) | Capacitor 6 | Wraps the Vite PWA output as a native Android app |
| Mobile (iOS) | PWA | Installable via Safari Add to Home Screen |
| QR codes | `qrcode.react` + `jsqr` | Generate and scan QR codes for check-in |
| Backend framework | Express 5 (Node.js) | ESM bundle via esbuild |
| Database | PostgreSQL (Neon serverless) | Connection via `DATABASE_URL` |
| ORM | Drizzle ORM + drizzle-kit | Schema push (dev), migrations (prod via GitHub Actions) |
| Validation | Zod v3 + `drizzle-zod` | Auto-generates insert schemas from Drizzle table definitions |
| Authentication | JWT (jsonwebtoken) + bcrypt | HttpOnly cookie primary; Bearer header fallback |
| AI Assistant | Google Gemini API | `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-lite` fallback chain |
| File/media storage | Cloudinary | Direct browser upload via signed signature from API |
| Email | Nodemailer | Password reset emails |
| Push notifications | Firebase Admin SDK (FCM) + Capacitor Local Notifications | See [Push Notifications](#push-notifications) |
| Logging | Pino + pino-http | Structured JSON logging; request serializer strips query params |
| API codegen | Orval | Generates React Query hooks and Zod schemas from `lib/api-spec/openapi.yaml` |
| Build (API) | esbuild via `build.mjs` | Bundles to `dist/index.mjs`; externalises native-only packages |
| Build (Frontend) | Vite | Outputs to `dist/`; served as static from Firebase CDN |
| Android build | Codemagic (mac_mini_m1) | Capacitor sync → Gradle → debug APK → GitHub Release |
| CI/CD | GitHub Actions | 3 workflows: Firebase deploy, Neon migrate, Codemagic trigger |
| Frontend hosting | Firebase Hosting (lugazi-system1) | CSP, HSTS, immutable asset caching |
| Backend hosting | Render | Auto-redeploy on push to main |

---

## Database Schema

Every feature domain has a matching pair:
- `lib/db/src/schema/<domain>.ts` — Drizzle table definition
- `artifacts/api-server/src/routes/<domain>.ts` — API endpoints for that table

| Schema file | Tables | Key fields |
|---|---|---|
| `users.ts` | `users` | email, passwordHash, displayName, role, isActive, passwordResetToken/Expiry |
| `members.ts` | `members` | fullName, email, phone, role, branchId, cellGroupId, qrToken, photoUrl, birthday |
| `branches.ts` | `branches` | name, location, leaderId |
| `groups.ts` | `groups` | name, type (`cell`/other), branchId, leaderId, meetingSchedule |
| `familyMembers.ts` | `family_members` | memberId, relatedMemberId, relationship |
| `pipeline.ts` | `pipeline` | name, phone, stage, assignedTo, source, branchId, lastContactedAt |
| `induction.ts` | `induction_tracks`, `induction_enrollments` | tracks: name, level, totalSessions; enrollments: memberId, trackId, progress (0–100), status |
| `attendance.ts` | `attendance` | memberId, eventId, checkedInAt, method (manual/QR) |
| `events.ts` | `events` | title, date, time, location, category, description |
| `dutyRoster.ts` | `duty_roster` | userId, role, date, serviceType |
| `finance.ts` | `transactions` | type, amount (UGX), category, description, branchId, date |
| `giving.ts` | `contributions` | memberId, memberName, type, amount (UGX), currency, reference |
| `welfare.ts` | `welfare` | memberId, category, description, amountRequested, status, adminNote |
| `meetings.ts` | `meetings` | title, scheduledAt, location, status, portalTarget, minutes |
| `chat.ts` | `chat_messages`, `chat_reactions`, `private_messages`, `user_status` | groupId/global chat, reactions, DMs, online status |
| `announcements.ts` | `announcements` | title, body, audience, authorId |
| `prayerRequests.ts` | `prayer_requests` | memberId, request, status, adminNote |
| `testimonies.ts` | `testimonies` | memberId, content, isPublished |
| `sermons.ts` | `sermons` | title, preacher, date, audioUrl, videoUrl, notes |
| `media.ts` | `media` | title, type, url, thumbnailUrl, cloudinaryId, uploadedBy |
| `documents.ts` | `documents` | title, fileUrl, category, uploadedBy |
| `tasks.ts` | `tasks` | title, assignedToUserId, dueDate, priority, status |
| `reports.ts` | `reports` | type, content, generatedBy, createdAt |
| `roleRequests.ts` | `role_requests` | userId, requestedRole, currentRole, reason, status, adminNote, reviewedAt |
| `ministryTeams.ts` | `ministry_teams`, `ministry_team_members` | name, leaderId, members |
| `settings.ts` | `settings` | key, value (key-value store for system config) |
| `activityLogs.ts` | `activity_logs` | userId, displayName, action, entityType, entityId, details, ipAddress |
| `inAppNotifications.ts` | `in_app_notifications` | userId, title, message, isRead, fcmSentAt, relatedEntityType/Id |
| `fcmTokens.ts` | `fcm_tokens` | userId, token, platform (android/ios) |

---

## API Routes

All routes are mounted under `/api`. Auth middleware is applied per-route.

| Route file | Endpoints | Role required |
|---|---|---|
| `health.ts` | `GET /api/healthz` | Public |
| `version.ts` | `GET /api/version` | Public — fetches latest APK build from GitHub Releases |
| `auth.ts` | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password` | Public (rate-limited: 5 req/15min per IP) |
| `users.ts` | CRUD for user accounts | admin |
| `roleRequests.ts` | `GET/POST /role-requests`, `PATCH /role-requests/:id/approve`, `PATCH /role-requests/:id/reject` | any (submit), admin (review) |
| `members.ts` | CRUD + search for member profiles | auth |
| `familyMembers.ts` | Link family relationships to members | auth |
| `branches.ts` | CRUD for church branches | auth |
| `groups.ts` | CRUD for cell groups and ministry groups | auth |
| `ministryTeams.ts` | CRUD for ministry teams and membership | auth |
| `attendance.ts` | Record and query attendance; QR check-in | auth |
| `events.ts` | CRUD for church events | auth |
| `dutyRoster.ts` | CRUD for duty roster assignments | auth |
| `meetings.ts` | CRUD for meetings and minutes | auth |
| `finance.ts` | CRUD for income/expense transactions | leadership+ |
| `giving.ts` | CRUD + summary for contributions | leadership+ |
| `welfare.ts` | CRUD for welfare requests | auth (submit), admin (review) |
| `pipeline.ts` | CRUD for visitor/prospect pipeline | auth |
| `induction.ts` | CRUD for tracks and enrollments | auth |
| `sermons.ts` | CRUD for sermon records | auth |
| `media.ts` | CRUD + Cloudinary upload signature | auth |
| `documents.ts` | CRUD for shared documents | auth |
| `announcements.ts` | CRUD for announcements | auth |
| `chat.ts` | Group chat, private messages, reactions, user status | auth (rate-limited: 20/min) |
| `prayerRequests.ts` | CRUD for prayer requests | auth |
| `testimonies.ts` | CRUD for testimonies | auth |
| `tasks.ts` | CRUD for tasks; `GET /tasks/my` for own tasks | auth |
| `reports.ts` | Generate and retrieve reports | auth |
| `settings.ts` | Read/write system settings | admin |
| `dashboard.ts` | `GET /dashboard/stats`, `/dashboard/recent-activity`, `/dashboard/member-stats`, `/dashboard/my-attendance` | auth (stats: leadership+) |
| `activityLogs.ts` | Read activity audit trail | admin |
| `inAppNotifications.ts` | List, mark-read, delete in-app notifications | auth |
| `notifications.ts` | `GET /notifications/schedule` — upcoming items for local notification scheduling | auth |
| `fcmTokens.ts` | `POST /fcm-tokens` (register), `DELETE /fcm-tokens` (unregister) | auth |
| `ai.ts` | `POST /ai/assist` — Gemini-powered AI assistant | auth (rate-limited: 10/min) |

---

## Authentication & Security

### Auth Flow

1. **Register** — email validated with regex + DNS MX record check; password hashed with `bcrypt` (cost 12); a linked `members` record is created automatically.
2. **Login** — returns a JWT signed with `JWT_SECRET`; set as an **HttpOnly, Secure, SameSite=None** cookie (`dcl_token`, 2-day expiry; 14-day with "Remember me"). The token is also returned in the response body for the native Android app (which uses `Authorization: Bearer` header as a fallback).
3. **Every request** — `requireAuth` verifies the JWT, then re-checks `isActive` in the database on every call so deactivated accounts are blocked immediately without waiting for token expiry.
4. **Password reset** — a UUID token is stored in the DB with a 1-hour expiry; the reset link is emailed via Nodemailer. The token is single-use (cleared on use).

### Rate Limiting

All rate limiters are in-memory, keyed by authenticated `userId` where possible (falling back to IP for unauthenticated routes), so users sharing a church Wi-Fi network don't share buckets.

| Scope | Limit | Window |
|---|---|---|
| Auth endpoints (`/auth/login`, `/auth/register`) | 5 requests | 15 minutes per IP |
| All other API routes | 1,000 requests | 15 minutes per user |
| AI assistant | 10 requests | 1 minute per user |
| Chat messages | 20 messages | 1 minute per user |

### Security Headers

Set on every response by `app.ts`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` (disables broken legacy mode)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)

Firebase Hosting also enforces CSP, HSTS, and immutable asset caching on the frontend.

### CORS

In production the API accepts requests from:
- `*.onrender.com` (the API's own Render domain)
- `*.web.app` and `*.firebaseapp.com` (Firebase Hosting)
- `capacitor://localhost` and `http://localhost` / `https://localhost` (Capacitor Android/iOS)
- Any additional origins listed in the `ALLOWED_ORIGINS` env var (comma-separated)

### Supply-Chain Protection

`.npmrc` sets `minimumReleaseAge: 1440` — pnpm will not install any package version published less than 24 hours ago. This blocks the most common npm supply-chain attack vector. Only `@replit/*` packages are excluded from this requirement.

---

## AI Assistant

A floating AI button appears on every page. It sends the user's question plus a page context string to the API, which calls Google Gemini.

**System prompt** — the model is instructed to act as a church management assistant for DCL Lugazi (Uganda context), keep responses to 3–4 sentences, and stay practical and faith-based.

**Model fallback chain** — the API tries models in order and returns the first success:
1. `gemini-2.5-flash`
2. `gemini-2.0-flash`
3. `gemini-2.0-flash-lite`

**Rate limiting** — 10 requests per user per minute (in-memory, keyed by `userId`). Prompt length is capped at 2,000 characters to control token costs.

**Required env var:** `GEMINI_API_KEY` — get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey). Enable the "Generative Language API" in Google Cloud Console.

---

## Push Notifications

The app uses two separate notification systems that serve different purposes and are visually distinct.

### 🔴 Live FCM Notifications (server-pushed)

Real-time alerts triggered by events in the system — role upgrade decisions, task assignments, welfare approvals, and other `in_app_notifications` records.

**How it works:**
1. An action in the system writes a record to the `in_app_notifications` table (with `fcmSentAt = null`).
2. The FCM background worker in `fcm.ts` polls every **30 seconds** for unsent records created in the last 10 minutes.
3. It pushes the notification to every FCM device token registered for that user (`fcm_tokens` table).
4. Firebase Admin SDK sends via the **FCM HTTP v1 API**. The Android config sets `icon: "ic_launcher"` and `priority: "high"` so the notification appears immediately with the **app icon**.
5. Stale tokens (permanently invalid according to Firebase) are automatically deleted from the DB.

**Device token registration:** When a user logs in on a native device, `PushNotifications.tsx` registers the FCM token with `POST /api/fcm-tokens`. Tokens are refreshed on every app launch to handle token rotations.

**Foreground behaviour:**
- **Android** — the OS shows the FCM notification natively even when the app is in the foreground (Android 8+ with a high-importance channel). No manual local fallback is needed.
- **iOS** — FCM suppresses the notification UI in the foreground, so the `pushNotificationReceived` listener fires a local notification fallback instead (with `largeIcon: "ic_launcher"`).

**Required env var:** `FIREBASE_SERVICE_ACCOUNT` — the full JSON contents of your Firebase service account key. Generate one at: Firebase Console → Project Settings → Service Accounts → "Generate new private key". Set this on Render.

### 📅 Scheduled Local Notifications (device-side)

Reminders for upcoming items — meetings, events, birthdays, tasks, and Sunday services — scheduled **locally on the device** by the Capacitor Local Notifications API. No server push is needed once they are scheduled.

**How it works:**
1. On every app start and `resume` event, `notificationScheduler.ts` calls `GET /api/notifications/schedule`.
2. The API returns upcoming meetings (next 7 days, scoped to the user's role), events, birthdays, and tasks due within 7 days.
3. All previously-scheduled local notifications are cancelled and replaced fresh (no duplicates).
4. Notifications fire at calculated times:
   - **Meetings** — 24 hours before and 1 hour before
   - **Events** — 24 hours before and 1 hour before
   - **Birthdays** — 7am on the birthday
   - **Tasks** — 8am on the due date
   - **Sunday service** — 9am every Sunday (4 weeks ahead), only when no service event exists in the system for that week
5. All scheduled notifications show the **app icon** (`largeIcon: "ic_launcher"`) and play sound.

### Notification Channels (Android)

| Channel ID | Name | Used for |
|---|---|---|
| `dcl-push` | DC Lugazi Alerts | Live FCM notifications |
| `dcl-reminders` | DC Lugazi Reminders | Scheduled local reminders |

Both channels use importance 5 (max) so they always produce a heads-up popup, sound, and vibration.

---

## Android Build Pipeline (Codemagic)

The Android APK is built automatically by **Codemagic** (`codemagic.yaml`) on a `mac_mini_m1` instance. The build is triggered by the `trigger-codemagic.yml` GitHub Action whenever relevant code changes are pushed to `main`.

**Build steps:**
1. **Install dependencies** — `pnpm install`
2. **Build shared libraries** — `tsc --build` for composite libs; build `api-client-react`
3. **Inject build metadata** — writes `VITE_BUILD_DATE` and `VITE_BUILD_NUMBER` into `artifacts/lugazi/.env`
4. **Build web app** — `NODE_ENV=production pnpm --filter @workspace/lugazi run build` (outputs to `dist/`)
5. **Capacitor sync** — `cap add android` + `cap sync android`; injects `google-services.json` from the `GOOGLE_SERVICES_JSON` Codemagic secret for FCM support
6. **Patch AndroidManifest.xml** — injects Firebase default notification icon metadata (`com.google.firebase.messaging.default_notification_icon = @mipmap/ic_launcher`) so FCM notifications always show the app icon
7. **Generate app icons** — uses Pillow to resize `resources/icon.png` into all mipmap densities (`mdpi` → `xxxhdpi`) for both `ic_launcher.png` and `ic_launcher_round.png`; removes the default Capacitor adaptive icon XMLs so the custom PNG icon is used on all Android versions
8. **Build debug APK** — `./gradlew assembleDebug`
9. **Publish to GitHub Releases** — uploads the APK to the `latest-build` tag in this repo (always overwrites so the latest APK is always at a stable URL)

**APK download URL (always latest build):**
```
https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk
```

**Version endpoint:** `GET /api/version` — the API fetches the latest GitHub Release metadata and returns the build number (parsed from the release name convention `"DC Lugazi Android App #<N>"`), published date, and download URL. The app uses this to show users whether a newer APK is available.

**Codemagic secrets required** (`lugazi_secrets` group):

| Secret | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Production API base URL for the Vite build |
| `GOOGLE_SERVICES_JSON` | Firebase `google-services.json` for FCM in the Android app |
| `GH_RELEASE_TOKEN` | GitHub token for uploading the APK to GitHub Releases |

---

## CI/CD (GitHub Actions)

Three workflows run automatically on push to `main`:

### 1. `deploy-firebase.yml` — Frontend Deploy

**Trigger:** Push to `main` when files under `artifacts/lugazi/**`, `lib/api-client-react/**`, `lib/api-zod/**`, `lib/api-spec/**`, or lockfile change.

**Steps:**
1. Authenticate with Google Cloud using `FIREBASE_SERVICE_ACCOUNT` (generates an OAuth access token)
2. `pnpm install`
3. Build `@workspace/api-client-react`
4. Build `@workspace/lugazi` with `NODE_ENV=production` and `VITE_API_BASE_URL`
5. Deploy `artifacts/lugazi/dist` to Firebase Hosting site `lugazi-system1`

**GitHub secrets required:**

| Secret | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Google Cloud service account JSON for Firebase deployment auth |
| `VITE_API_BASE_URL` | Production API base URL injected at build time |

### 2. `migrate-neon.yml` — Database Migration

**Trigger:** Push to `main` when files under `lib/db/src/schema/**` or `lib/db/drizzle.config.ts` change.

**Steps:**
1. `pnpm install`
2. `pnpm --filter @workspace/db run push` — runs `drizzle-kit push` against the live Neon database

**GitHub secrets required:**

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |

### 3. `trigger-codemagic.yml` — Android Build Trigger

**Trigger:** Push to `main` when files under `artifacts/lugazi/**`, `artifacts/api-server/**`, `lib/**`, or `codemagic.yaml` change.

**Steps:**
1. Calls the Codemagic REST API (`POST https://api.codemagic.io/builds`) to start the `android-capacitor-build` workflow for the `main` branch

**GitHub secrets required:**

| Secret | Purpose |
|---|---|
| `CODEMAGIC_API_TOKEN` | Codemagic API bearer token |
| `CODEMAGIC_APP_ID` | Codemagic app ID for this project |

---

## Environment Variables

### API Server (set on Render)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `JWT_SECRET` | ✅ | JWT signing key — server refuses to start if missing |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ for push | Firebase Admin SDK service account JSON (full file contents); enables FCM live push notifications |
| `GEMINI_API_KEY` | ✅ for AI | Google Gemini API key; AI assistant returns an error message if missing |
| `CLOUDINARY_CLOUD_NAME` | ✅ for media | Cloudinary cloud name for media upload signatures |
| `CLOUDINARY_API_KEY` | ✅ for media | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ for media | Cloudinary API secret (used server-side to sign upload requests) |
| `SMTP_HOST` | ✅ for email | Nodemailer SMTP host for password reset emails |
| `SMTP_PORT` | ✅ for email | SMTP port |
| `SMTP_USER` | ✅ for email | SMTP username |
| `SMTP_PASS` | ✅ for email | SMTP password |
| `SMTP_FROM` | optional | Sender address for emails (defaults to SMTP_USER) |
| `ALLOWED_ORIGINS` | optional | Comma-separated extra CORS origins |
| `NODE_ENV` | optional | Set to `production` on Render to enable HSTS and strict CORS |

### Frontend Build (set in GitHub Actions / Codemagic)

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | GitHub Actions + Codemagic | Production API base URL injected at Vite build time |
| `VITE_BUILD_DATE` | Codemagic | Build timestamp injected by the pipeline |
| `VITE_BUILD_NUMBER` | Codemagic | Build number from `CM_BUILD_NUMBER` injected by the pipeline |

---

## Running Locally

```bash
# 1. Install dependencies (always use pnpm — npm/yarn will be rejected)
pnpm install

# 2. Copy and fill in your local environment variables
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Add: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, CLOUDINARY_*, SMTP_*, FIREBASE_SERVICE_ACCOUNT

# 3. Run the API server (port 5001 in dev)
pnpm --filter @workspace/api-server run dev

# 4. Run the frontend (in a separate terminal; Vite will pick a free port)
pnpm --filter @workspace/lugazi run dev

# 5. (Optional) Push your local schema changes to the database
pnpm --filter @workspace/db run push

# 6. (Optional) Regenerate API client hooks from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# 7. Typecheck everything before committing
pnpm run typecheck
```

> **Note:** `pnpm run dev` does not exist at the workspace root by design. Always run dev commands per-package with `--filter`.

---

## Deployment

### Frontend → Firebase Hosting

Triggered automatically by `deploy-firebase.yml` when `artifacts/lugazi/**` or shared lib files change. Can also be triggered manually via `workflow_dispatch` in GitHub Actions.

The built output is `artifacts/lugazi/dist/` — Firebase serves it as a static SPA with a catch-all rewrite to `index.html` for client-side routing.

### API Server → Render

Render is connected to this repository and auto-deploys when the `main` branch is updated. The deployed command runs `node --enable-source-maps dist/index.mjs` from `artifacts/api-server/`.

Render environment variables (see [Environment Variables](#environment-variables)) must be configured in the Render dashboard. The server will refuse to start if `DATABASE_URL` or `JWT_SECRET` are missing.

### Database → Neon

Schema changes are applied automatically by `migrate-neon.yml` when schema files change. You can also push manually:

```bash
DATABASE_URL=<your-neon-url> pnpm --filter @workspace/db run push
```

Drizzle Kit uses `push` mode (not migrations with migration files). Schema is the source of truth.

### Android APK → GitHub Releases

Built by Codemagic and published to the `latest-build` GitHub Release tag. The release is always overwritten so the latest APK is always available at the stable URL:

```
https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk
```

---

## Glossary

- **PWA (Progressive Web App):** A website installable on a phone like a native app — own icon, full-screen, works offline for cached content — without needing an App Store.
- **Capacitor:** A tool by Ionic that wraps a web app (built by Vite) into a native Android or iOS shell so it can be distributed as a real APK.
- **Codemagic:** A cloud CI/CD service that builds mobile apps. Used here to compile the Capacitor Android APK on a Mac build machine.
- **APK:** Android Package — the file format for installing Android apps.
- **API:** The "messenger" between the frontend and the database. All data requests go through the Express API server.
- **REST API:** A design pattern for APIs that uses standard HTTP methods (GET, POST, PATCH, DELETE) and URL paths to define operations.
- **Monorepo:** One repository containing multiple related projects (frontend, backend, shared code) instead of separate repos.
- **pnpm:** A fast, disk-efficient alternative to npm for managing JavaScript dependencies.
- **Drizzle ORM:** A TypeScript-first tool that lets you define database tables as TypeScript code and talk to the database without writing raw SQL.
- **Drizzle Kit (`push`):** The command-line tool that compares your schema code to the live database and applies the differences automatically.
- **Neon:** A serverless PostgreSQL provider — the database lives in the cloud with auto-scaling and branching.
- **Zod:** A TypeScript validation library. Schemas are generated automatically from Drizzle table definitions using `drizzle-zod`.
- **Orval:** A code generator that reads the OpenAPI spec and produces ready-to-use React Query hooks and Zod schemas.
- **JWT (JSON Web Token):** A signed digital "ticket" issued when a user logs in. Every subsequent API request includes it so the server knows who you are.
- **HttpOnly cookie:** A browser cookie that JavaScript cannot read — stored securely by the browser and sent automatically with every request. Used for the JWT to protect against XSS attacks.
- **FCM (Firebase Cloud Messaging):** Google's service for sending push notifications to Android and iOS devices.
- **Firebase Admin SDK:** A server-side library that lets the API server send FCM push notifications without going through the browser.
- **Cloudinary:** A cloud media storage and delivery platform. Media files are uploaded directly from the browser to Cloudinary (not through the API server), using a signed upload signature obtained from the API.
- **Pino:** A fast structured JSON logger for Node.js.
- **esbuild:** An extremely fast JavaScript bundler used to compile the Express API server into a single deployable file (`dist/index.mjs`).
- **Role-Based Access:** A security model where what you can see and do depends entirely on your assigned role (admin, pastor, leadership, workforce, or member).
- **QR Token:** A unique random string stored on each member's record, encoded into a QR code on their profile. Scanning it during an event automatically records their attendance.
- **CSP (Content Security Policy):** A browser security header that tells the browser which domains are allowed to load scripts, styles, images, and other resources — blocking most injection attacks.
- **HSTS (HTTP Strict Transport Security):** A header that forces the browser to always use HTTPS for this domain, even if the user types `http://`.
- **MX record check:** During registration, the API checks that the email domain has a mail server configured. This blocks sign-ups with fake or disposable email addresses that would never receive a confirmation or reset email.
- **Supply-chain attack:** An attack where malicious code is smuggled into a legitimate npm package. The `minimumReleaseAge: 1440` setting in `.npmrc` defends against this by refusing packages published less than 24 hours ago.

---

*This README covers the full technical and operational setup of the DCL Lugazi ERP system for developers, DevOps, and non-technical church leadership alike.*
