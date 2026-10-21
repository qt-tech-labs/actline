# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Actline is an IoT-assisted project execution hub (Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Drizzle + PostgreSQL 17, next-intl, Zod). Product requirements are in `doc/requirement.md`; the full architecture is in `doc/architecture.md`. `design/` holds reference HTML mockups and is not part of the build.

## Commands

```bash
cp .env.example .env.local      # DATABASE_URL, DEMO_USER_EMAIL
npm install
npm run db:up                   # docker compose up -d db (Postgres on :5432)
npm run db:migrate              # apply drizzle/*.sql
npm run db:seed                 # demo user + project (re-runnable)
npm run dev

npm run lint
npm run typecheck               # tsc --noEmit
npm run build
```

Schema change: edit `src/server/db/schema.ts` → `npm run db:generate` → commit the SQL in `drizzle/` → `npm run db:migrate`. There is no test runner configured.

## Architecture

Layering: `src/app/api/v1/**` route handlers and Server Components both call `src/server/services/**`, which own all business logic and talk to Drizzle (`src/server/db`).

- Route handlers stay thin: auth + Zod validation + error mapping via the `route()` wrapper in `src/server/api.ts`.
- `server-only` guards `src/server/**`. Services are wrapped in `React.cache` for per-request dedupe, so sections that need the same data share one query.
- Services map DB rows to DTOs in `src/lib/types.ts` (plain serialisable objects shared with client components); don't pass raw rows to the client.
- Mutations go through REST (`/api/v1`) even from the web app (shared contract with a future mobile app). Client pattern: `startTransition` → `useOptimistic` → fetch (`src/lib/api-client.ts`) → `router.refresh()`.
- Ownership checks live in `services/mutations.ts` (join up to `projects.user_id`); project reads go through `getProjectRow(userId, id)`. Every service takes `userId` explicitly.
- Auth is a seam: `getCurrentUser()` in `src/server/auth.ts` returns the seeded demo user. Implement real auth only by changing that function.
- The plan in `/new` is crafted by the plan-craft skill (`src/server/ai/`): the model calls five tools in one turn, the server validates and repairs every call, and the template engine (`server/blueprint-templates.ts`) is the fallback. The rules live in `src/server/ai/skills/plan-craft/SKILL.md`; `src/lib/blueprint.ts#normalizeBlueprint` is the single place that guarantees the plan's invariants (nodes tile the project, items stay inside their node, a day never exceeds the daily time, the BOM fits the budget).
- `page.tsx` only resolves the project id, then renders ~13 sections each in its own `<Suspense>` with a fixed-height skeleton. Keep sections independent and use `Promise.all` for independent queries within services.
- Only interactive components are Client Components (marked `*` in the directory map in `doc/architecture.md`). No barrel files; no UI library.
- Step status is derived from checklist items by `lib/steps.ts#statusFromItems`; `StepsPanel`'s optimistic reducer mirrors it, so keep them in sync.

- IoT is optional per project (`projects.iot_enabled`). Anything sensor/hub/camera/automation related must be gated on it (see `page.tsx`, `services/hub-config.ts`); plan, steps, supplies and finance must never depend on IoT data.
- The IoT settings modal lives in `src/components/hub/` and talks to `/api/v1/projects/{id}/hub*`; `hubs.config` is typed by `src/lib/hub-config.ts`. Hub commands are queued in `hub_commands`; the web app never contacts a device directly.

## Conventions

- Data: UUID primary keys; money is integer VND; the current project day is derived from `projects.start_date` (never stored); sensor ok/low/high status is derived from `sensor_targets` at read time.
- i18n: cookie-based locale (`NEXT_LOCALE`, default `vi`), no URL prefix. All UI strings live in `messages/vi.json` and `messages/en.json`; no literals in components (`getTranslations` on the server, `useTranslations` on the client). `NextIntlClientProvider` in `layout.tsx` only receives the namespaces client components use, so add any new client namespace there. The header's `LocaleSwitcher` writes the cookie and calls `router.refresh()`.
- Icons: Material Symbols loaded as a Google Fonts subset via `icon_names=`. A new icon (including names stored in the DB) must be added to `src/lib/icons.ts`.
- Sparklines are server-rendered SVG (`lib/sparkline.ts`); the only per-second client work is `LiveClock`.
