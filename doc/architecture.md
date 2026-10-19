# Actline architecture

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components, Turbopack) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4, design tokens in `@theme` (`src/app/globals.css`) |
| Fonts | `next/font/google` (Manrope, Space Grotesk, JetBrains Mono); Material Symbols as a Google Fonts **subset** |
| i18n | `next-intl`, cookie-based locale (no URL prefix), `messages/vi.json` |
| Database | PostgreSQL 17 (Docker Compose), Drizzle ORM + `postgres` driver, SQL migrations in `drizzle/` |
| Validation | Zod |
| API | Versioned REST route handlers under `/api/v1` |

## 2. Layering

```
 Browser / future mobile app
        │ REST (JSON)                     React Server Components
        ▼                                         │ direct calls
 src/app/api/v1/**  ──────────►  src/server/services/**  ◄────────┘
   (thin: auth + zod + map errors)   (business logic, React.cache)
                                          │
                                   src/server/db  (Drizzle schema + client)
                                          │
                                      PostgreSQL
```

Rules:
1. **Services own the logic.** Route handlers and Server Components both call them; neither talks to Drizzle directly (except trivial reads inside services).
2. **`server-only`** guards `src/server/**`, so DB code can never reach a client bundle.
3. **DTOs** (`src/lib/types.ts`) are plain serialisable objects shared by server and client. Services map DB rows to DTOs so the page never ships columns it does not render.
4. **Mutations go through REST** (`/api/v1`), even from the web app, so web and mobile share one contract. After a mutation the client calls `router.refresh()` to re-render server data.
5. **Ownership** is enforced in `services/mutations.ts` (joins up to `projects.user_id`); reads of a project go through `getProjectRow(userId, id)`.

## 2a. IoT is optional per project

Actline is an action planner; IoT is an opt-in add-on (`projects.iot_enabled`, default `false`).
- `page.tsx` reads `iotEnabled` from `getProjectOverview` and only renders the IoT sections (metrics grid, live cam, hardware, automation rules) when it is true; `MobileNav` hides the Live Cam / Cảm biến entries; `ProgressBar` shows the hub chip, or an `EnableIotButton` call to action when IoT is off.
- `PATCH /projects/{id}` `{ iotEnabled }` (`setProjectIot`) toggles it and creates an empty hub row on first enable. Disabling keeps hub, device and reading data.
- IoT services scope their ownership lookup with `projects.iot_enabled = true` (`ownedHub` in `services/hub-config.ts`), so the hub endpoints return 404 for non-IoT projects. `/projects/{id}/today` returns `null` for `metrics`, `hardware` and `automationRules` when IoT is off.
- Nothing in plan, steps, supplies, finance or milestones may depend on IoT data.
- Planned, not built: the create-project flow suggests enabling IoT for sensor-driven templates (see requirement.md FR-9.2).

## 3. Directory map

```
design/                    reference HTML designs (not part of the build)
doc/                       requirement.md, architecture.md
messages/vi.json           all UI strings
drizzle/                   generated SQL migrations
src/
  app/
    layout.tsx             fonts, icon subset, NextIntlClientProvider (client namespaces only)
    page.tsx               Home: composes sections, each behind <Suspense>
    error.tsx              route error boundary
    api/v1/**/route.ts     REST endpoints
  components/
    layout/                AppHeader, ProjectSwitcher*, ProgressBar, MilestoneTimeline*, MobileNav
    hub/                   HubSettingsButton*, HubSettingsDialog* (IoT settings modal), EnableIotButton*
    metrics/               MetricsGrid, Sparkline (server-rendered SVG)
    sidebar/               ProjectList, LiveCamCard, LiveClock*, HardwareCard
    today/                 TodaySection, StepsPanel*, QuickNoteButton*, IncidentFab*
    right/                 SuppliesCard, FinanceCard, RulesCard, RuleList*, LookaheadCard
    ui/                    Icon, Card, Dialog*, TextReportDialog*, Skeleton, ComingSoon
  i18n/                    config.ts (locales), request.ts (cookie → locale + messages)
  lib/                     types, hub-config (HubConfig type, Zod settings schema, URL masking), day math, formatting, sparkline paths, api-client, icons list
  server/
    auth.ts                getCurrentUser() seam
    api.ts                 route() wrapper, error → HTTP mapping
    db/                    schema.ts, index.ts, seed.ts
    services/              projects, timeline, metrics, day, hardware, hub-config, finance, automation, mutations
```
`*` = Client Component. Everything else is a Server Component.

## 4. Rendering and performance (Vercel React best practices applied)

- **Eliminate waterfalls / stream** (`async-parallel`, `async-suspense-boundaries`): `page.tsx` resolves only the project id, then renders ~13 sections, each in its own `<Suspense>` with a fixed-height skeleton. Sections fetch concurrently; inside services independent queries use `Promise.all`.
- **Per-request dedupe** (`server-cache-react`): services are wrapped in `React.cache`, so `getProjectOverview`, `getDayPlan`, `getHardware`, `getFinance` are shared by the several sections that need them (one DB query each per request).
- **Minimal client JS** (`server-serialization`): only interactive pieces are client components. Props are trimmed DTOs. `NextIntlClientProvider` receives only the namespaces client components use.
- **Bundle** (`bundle-barrel-imports`): no barrel files; direct imports; no UI library. The icon font is requested with `icon_names=` (a few KB) instead of the ~4 MB full font.
- **Re-render** (`rerender-*`): `useOptimistic` + `useTransition` for mutations (no effects for derived state); step status is derived from checklist items with one shared function; static data (icon maps, metric config) is hoisted to module scope.
- **Rendering**: sparklines are plain SVG generated on the server with 1-decimal precision; the only per-second client work is `LiveClock`.
- **Event listeners**: `ProjectSwitcher` attaches document listeners only while open.

## 5. Optimistic mutation flow

```
click → startTransition → apply(optimistic) → fetch /api/v1/... → router.refresh()
                                  │ on error: optimistic state auto-reverts + inline alert
```
The reducer in `StepsPanel` mirrors the server rule (`lib/steps.ts#statusFromItems`) so the optimistic and persisted states agree.

## 6. Data model (summary)

```
users 1─* projects 1─* project_stages
                  1─* milestones
                  1─* day_plans 1─* steps 1─* step_items
                  │            │       └─* step_photos
                  │            └─* supplies
                  1─* expenses / sensor_readings / sensor_targets / ai_insights
                  1─* automation_rules / notes / incidents
                  1─1 hubs 1─* devices (camera metadata in jsonb)
                          └─* hub_commands (queued for the device)
                  projects.iot_enabled gates everything from sensor_readings down to hubs
```
Design notes:
- `hubs.config` (jsonb, typed `HubConfig` in `lib/hub-config.ts`) holds what the IoT settings modal shows: firmware/chip, Wi-Fi, MQTT broker, pin map, camera RTSP URL and the editable firmware settings. Device-reported facts (Wi-Fi, firmware, pins) are seeded today and will be written by the future ingestion endpoint; the user-editable subset is `hubSettingsSchema`.
- The RTSP URL password is masked (`rtsp://user:***@host`) in every response and restored on save if the client sends the masked value back.
- `hub_commands` is an outbox: the web app never talks to a device; it queues a command (currently only `valve_test`) for the hub to pick up. Nothing consumes it yet.
- UUID primary keys (client-generated ids for offline mobile later); `sensor_readings` uses `bigserial` for volume, indexed by `(project_id, metric, recorded_at)`.
- Status columns are Postgres enums.
- The current day is **derived** from `projects.start_date`, not stored, so it cannot go stale.
- Money is stored as integer VND.
- Sensor "status" (ok/low/high) is derived from `sensor_targets` at read time.

## 6a. IoT settings modal

```
ProgressBar (hub chip) → HubSettingsButton* → HubSettingsDialog* → Dialog (wide) → HubSettingsForm*
  GET   /projects/{id}/hub            load config + latest readings (on every open; the Dialog unmounts its children when closed)
  PATCH /projects/{id}/hub            save telemetry interval, sleep/watchdog toggles, MQTT host/port, camera URL
  POST  /projects/{id}/hub/ping       heartbeat age; online = last_seen_at within 120 s
  POST  /projects/{id}/hub/commands   queue a 5 s valve test (409 if offline; reuses a pending one)
```
The form edits a local draft, validates (host, port, RTSP scheme) before enabling save, then `router.refresh()` and closes. Wi-Fi rescan, calibration, per-pin configuration and stream test are rendered disabled ("Sắp ra mắt"). The client namespaces `hubSettings` and `progress` are included in `NextIntlClientProvider`.

## 7. Authentication seam

`getCurrentUser()` returns the seeded demo user (`DEMO_USER_EMAIL`). To add real auth, change only this function (session cookie for web, bearer token for mobile) and keep every service signature (`userId` is already passed explicitly).

## 8. Internationalisation

- Locale comes from the `NEXT_LOCALE` cookie (default `vi`), so URLs are identical across languages and mobile deep links stay simple.
- To add English: add `"en"` to `src/i18n/config.ts`, create `messages/en.json` with the same keys, and expose a switcher that sets the cookie.
- Components never contain literals; server components use `getTranslations`, client components `useTranslations`.
- Limitation: database-authored content is single-language (see requirement.md §7).

## 9. Local development

```bash
cp .env.example .env.local     # already created on scaffold
npm install
npm run db:up                  # docker compose up -d db  (Postgres on :5432)
npm run db:migrate             # apply drizzle/*.sql
npm run db:seed                # demo user + project (re-runnable)
npm run dev
```
Schema changes: edit `src/server/db/schema.ts`, `npm run db:generate`, commit the new SQL, `npm run db:migrate`.

Checks: `npm run lint`, `npm run typecheck`, `npm run build`.

## 10. Extending

- **New screen**: add a route in `src/app`, compose existing components, add services if data is new, add keys to `messages/`.
- **New icon**: add its name to `src/lib/icons.ts` (also for icon names stored in the DB).
- **Mobile app**: consume `/api/v1`; add a token strategy in `getCurrentUser()`. Consider an OpenAPI spec generated from the Zod schemas.
- **Create-project IoT suggestion**: add the flow, store `iot_enabled` from the user's choice, and suggest it from the project template or description (requirement.md FR-9.2).
- **Real-time sensors**: add `POST /api/v1/hubs/{id}/readings` (device token auth) writing to `sensor_readings` and updating `hubs.last_seen_at`; push to the UI with SSE or polling `router.refresh()`.
