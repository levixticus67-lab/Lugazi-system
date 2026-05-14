# DCL Lugazi ERP

Enterprise Resource Planning system for Deliverance Church Lugazi "The House of Kingdom Giants". Manages members, attendance, finance, welfare, reports, and soul-winning across multiple branches with strict role-based portals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/lugazi run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (Replit built-in PostgreSQL)
- Required env: `JWT_SECRET` — secret for signing JWTs (set via Replit Secrets)
- Required env: `SESSION_SECRET` — session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS v4, Wouter router, React Query, shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (Replit built-in)
- Auth: JWT (bcrypt passwords, 30-day tokens)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/lugazi/` — React frontend (all portals)
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle ORM schema (14 tables)
- `lib/api-spec/` — OpenAPI spec (17 domains)
- `lib/api-client-react/` — Generated React Query hooks + Zod schemas
- `DEPLOYMENT_GUIDE.md` — Full deployment guide (Neon, Cloudinary, Render)

## Architecture decisions

- Pure JWT auth (no Firebase/sessions) — stateless, easy to deploy
- Hard-coded first admin: levixticus67@gmail.com / *levi#ticus123 auto-creates on first login
- 4-tier role hierarchy: admin > leadership > workforce > member, each with isolated portals
- Admin has a portal switcher to access all portals for oversight
- QR attendance resolves member by qrToken UUID (UUID v4, stored in members table)
- All DB schema in `lib/db/src/schema/` — one file per domain

## Product

- **Admin Portal**: Full ERP control — members, users/roles, branches, groups, attendance (QR + manual), finance, media, welfare, reports, soul-winning pipeline, documents, settings
- **Leadership Portal**: Branch/ministry management — members, groups, attendance, events, welfare, reports, pipeline
- **Workforce Portal**: Volunteer tools — attendance recording, events, reports, media
- **Member Portal**: Personal dashboard — profile, attendance history, events, welfare requests, role upgrade requests, QR code display

## User preferences

- Deep navy (#0f172a) + gold (#d4a017) branding — matches DCL brand identity
- Church tagline: "The House of Kingdom Giants"
- Uganda Shillings (UGX) as currency throughout
- All dates/times in locale format

## Gotchas

- DataTable uses TypeScript generics (`DataTable<T>`) in component definition but JSX usage must NOT include the generic `<DataTable<Member>...>` because Replit's Babel instrumentation injects `data-*` attributes that break the generic syntax. TypeScript infers from the `data` prop.
- Hard-coded admin auto-creates on first login. Remove the block in `artifacts/api-server/src/routes/auth.ts` before production (see DEPLOYMENT_GUIDE.md).
- `pnpm --filter @workspace/db run push` must be run when DB schema changes.
- JWT_SECRET must be set in production — see DEPLOYMENT_GUIDE.md.
- QR tokens are UUID v4 values stored per member — display with `useGetMemberQr(memberId)`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `DEPLOYMENT_GUIDE.md` for production deployment (Neon, Cloudinary, Render)
