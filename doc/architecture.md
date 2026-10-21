# Actline architecture

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components, Turbopack) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4, design tokens in `@theme` (`src/app/globals.css`) |
| Fonts | `next/font/google` (Manrope, Space Grotesk, JetBrains Mono); Material Symbols as a Google Fonts **subset** |
| i18n | `next-intl`, cookie-based locale (no URL prefix), `messages/vi.json` + `messages/en.json` |
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

### 2c. "No connect" state (`design/home/noconnect`)

When `hubs.online` is false the hub is treated as disconnected and the whole screen switches to the
offline treatment of the design:

| Surface | Offline treatment |
|---|---|
| Sub-header chip (`ProgressBar`) | red chip: hub name, `OFFLINE` badge, "Mất tín hiệu {time}", location, a **Kết nối lại** button that opens the hub settings |
| Sensor cards (`MetricsGrid`) | a red banner above the grid (hub name, time lost, last stored reading, **Kiểm tra Gateway** → `POST /hub/ping`, **Cấu hình kết nối IoT**); every tile then shows `--.-`, the last stored value, the reason ("Mất tín hiệu" / "Không phản hồi" for probes) and the time it was stored |
| Live cam (`LiveCamCard`) | `MẤT LUỔNG RTSP` header, a dimmed still with a reconnect overlay (attempt counter, retry → ping) and the last snapshot marked as stale |
| Hardware (`HardwareCard`) | red card, "0/n phản hồi", the gateway as "Mất kết nối", probes as "Không phản hồi", the valve in "Chế độ thủ công", and a **Cấu hình kết nối IoT** button |
| Today (`TodaySection`, `RulesCard`) | a `SAFE MODE` banner on the day card and the "Hệ thống tự ngắt an toàn" footer on the rules card |

`hubs.online` is the source of truth for the UI; `POST /projects/{id}/hub/ping` is the live check
(`last_seen_at` within 120 s). The demo seed contains a second IoT project whose hub stopped reporting,
so the state can be seen by switching project.

## 3. Directory map

```
design/                    reference HTML designs (not part of the build)
doc/                       requirement.md, architecture.md
messages/vi.json           all UI strings (Vietnamese)
messages/en.json           all UI strings (English)
drizzle/                   generated SQL migrations
src/
  app/
    layout.tsx             fonts, icon subset, NextIntlClientProvider (client namespaces only)
    page.tsx               Home: composes sections, each behind <Suspense>
    new/page.tsx           New-project studio (idea -> plan -> project)
    error.tsx              route error boundary
    api/v1/**/route.ts     REST endpoints
  components/
    layout/                AppHeader, ProjectSwitcher*, ProgressBar, MilestoneTimeline*, MobileNav
    hub/                   HubSettingsButton*, HubSettingsDialog* (IoT settings modal), EnableIotButton*,
                            HubOfflineBanner* (offline warning above the sensor cards)
    metrics/               MetricsGrid, Sparkline (server-rendered SVG)
    new/                   NewProjectProvider*, IdeaGenerator*, BlueprintPreview, BlueprintSummary,
                            HardwareKit, IotSwitch*, NodeGrid*, DayBrowser*, BomSupplies*, RiskForecast, ActionBar*
    sidebar/               LiveCamCard, LiveClock*, HardwareCard, CameraOfflineOverlay*
    today/                 TodaySection, StepsPanel*, QuickNoteButton*, IncidentFab*
    right/                 SuppliesCard, FinanceCard, RulesCard, RuleList*, LookaheadCard
    ui/                    Icon, Card, Dialog*, TextReportDialog*, Skeleton, ComingSoon, ConfirmDeleteButton*
  i18n/                    config.ts (locales), request.ts (cookie -> locale + messages)
  lib/                     types, hub-config (HubConfig type, Zod settings schema, URL masking), day math,
                            formatting, sparkline paths, api-client, icons list, blueprint (defaults, knobs,
                            normaliser), plan-ops (the edit operations)
  server/
    auth.ts                getCurrentUser() seam
    api.ts                 route() wrapper, error -> HTTP mapping
    blueprint-cookie.ts    the id of the plan on screen (cookie)
    blueprint-templates.ts template library: one template per kind of project (the fallback engine)
    ai/
      client.ts            the Gemini client, the model, the timeout
      plan-craft.ts        the orchestrator: one planning turn, repairs, one correction turn
      skills/              the skills: plan-craft/SKILL.md (the rules), tools.ts, validate.ts, system-prompt.ts
    db/                    schema.ts, index.ts, seed.ts
    services/              projects, timeline, metrics, day, hardware, hub-config, finance, purchases,
                            clone, automation, mutations, blueprint (craft, drafts, create)
```
`*` = Client Component. Everything else is a Server Component.

## 2b. New-project studio (`/new`)

`design/new/code.html` is implemented as a three-part screen: the idea generator, the live blueprint
and the persistent action bar.

- **The plan is a tree of nodes** (`src/lib/types.ts`): a blueprint holds **nodes** (a group of work
  with a time range and an objective) and every node holds **items** (one action item, pinned to a
  day). A day without an item is a normal state — the app shows the node's objective and offers an
  "add" button. The nodes become `project_stages`, the items become `steps` + `step_items`, and the
  days become `day_plans` (one per project day).
- **The knobs are the AI's to choose.** `BlueprintParams` fields are `null` when the user left them
  open, because the right values depend on the topic (a three-month renovation is not a 30-day job).
  The model proposes them with the `propose_constraints` tool in a first, small turn; the plan is
  then built with those values. Whatever the user set by hand always wins.
- **The plan is crafted by the plan-craft skill** (`src/server/ai/`): the model is given the user's
  idea plus the constraint envelope (days, minutes a day, budget, experience) and calls five tools
  (`create_node`, `add_supply`, `add_risk`, `add_device`, `finalize_plan`) in **one turn**. The server
  executes them against a draft, repairs what it can (day ranges, minutes, icons, prices) and only
  asks the model again when a call is genuinely unusable. The rules live in
  `src/server/ai/skills/plan-craft/SKILL.md` and are enforced by `validate.ts`.
- **The template engine is the fallback** (`server/blueprint-templates.ts`): no API key, a timeout or
  an unusable answer falls back to a deterministic plan in the same shape. `AI_PLAN_ENGINE=template`
  forces it.
- **The plan on screen is a stored draft** (table `blueprints`, `payload` jsonb). The AI plan cannot
  be derived again from the input, so it is stored; the cookie `actline_blueprint` only holds its id.
- **Hand edits are operations.** `PATCH /api/v1/blueprints/{id}` takes a batch of ops
  (`addNode`, `updateNode`, `deleteNode`, `addItem`, `updateItem`, `deleteItem`, `addSupply`,
  `updateSupply`, `deleteSupply`, `addCheckpoint`, `deleteCheckpoint`). They are applied by the pure
  `applyBlueprintOps` (`src/lib/plan-ops.ts`) and the plan is normalised again, so the invariants
  hold whatever the user does.
- **The normaliser** (`normalizeBlueprint`, `src/lib/blueprint.ts`) is the single place that
  guarantees the invariants: the nodes tile `1..totalDays`, every item sits on a day inside its node,
  a day never exceeds the daily time, and the bill of materials is scaled to the budget while the
  estimate stays honest. It is pure, so the client and the server agree.
- **A day is only "done" when its work is.** `completeDay` refuses to close a day while any of its
  action items is still open (`409`), and the button is disabled with the count of what is left.
- **The purchase list is the bill of materials plus the truth.** `supplies` carry the planned price,
  the price actually paid (`actual_price_vnd`) and the day it was bought. Marking an item as bought
  writes the matching `expenses` row, and un-marking it takes the money back — the purchase list and
  the money log can never drift apart. A purchase the plan did not foresee can be added at any time
  (`POST /projects/{id}/supplies`).
- **The money log** (`expenses`, `kind: cost | income`) is the project's ledger: what went out, what
  came in, and the result. `POST /projects/{id}/expenses` records an entry; `PATCH
  /projects/{id}/finance` adjusts the budget and the expected revenue.
- **A finished project is the basis for the next run.** `POST /projects/{id}/clone` copies the plan
  (stages, days, action items, checklists, milestones) into a fresh project, resets the day and the
  ledger, and turns the prices the last run *actually paid* into the new estimates.
- **Creating the project** (`POST /api/v1/projects`) writes stages, one day plan per project day with
  its action items and checklists, the shopping steps, the supplies, the milestones and — when the
  user accepted the IoT suggestion (FR-9.2) — a hub with the predicted devices.
- **IoT stays a suggestion**: the plan recommends it for sensor-driven projects, the user can
  decline it, and the project can still be connected later from the project itself (FR-9.3).
- **The studio is never a dead end**: the "Lộ trình hôm nay" tab and the mode chip in the header are
  real links back to the home screen, while the other three tabs stay "coming soon" (FR-1.3). On
  mobile the bottom bar jumps to the sections that exist (`#live-cam`, `#sensors`, `#supplies`);
  "Thêm" has no screen yet.


## 3a. Days, dates and timezones

- A project day is a **calendar date**: `dateOfProjectDay(start_date, day)` shifts the start date by
  whole days, so it never depends on a timezone.
- **"Today" follows the device.** The root layout renders `ViewerTimezone`, which writes the
  browser's timezone into the `actline_tz` cookie; `currentProjectDay` then resolves the current day
  in that timezone (`PROJECT_TZ` until the cookie arrives). The clock in the live-cam card uses the
  device timezone as well. The project timezone (`Asia/Ho_Chi_Minh`) is only the fallback.
- The milestone track shows the day code **and** the calendar date (`N16 · 20/10`), and every node
  opens the plan of that day: `GET /projects/{id}/days/{day}` (ownership checked) feeds the review
  dialog.

## 4. Rendering and performance (Vercel React best practices applied)

- **Eliminate waterfalls / stream** (`async-parallel`, `async-suspense-boundaries`): `page.tsx` resolves only the project id, then renders ~13 sections, each in its own `<Suspense>` with a fixed-height skeleton. Sections fetch concurrently; inside services independent queries use `Promise.all`.
- **Per-request dedupe** (`server-cache-react`): services are wrapped in `React.cache`, so `getProjectOverview`, `getDayPlan`, `getHardware`, `getFinance` are shared by the several sections that need them (one DB query each per request).
- **Minimal client JS** (`server-serialization`): only interactive pieces are client components. Props are trimmed DTOs. `NextIntlClientProvider` receives only the namespaces client components use.
- **Bundle** (`bundle-barrel-imports`): no barrel files; direct imports; no UI library. The icon font is requested with `icon_names=` (a few KB) instead of the ~4 MB full font.
- **Re-render** (`rerender-*`): `useOptimistic` + `useTransition` for mutations (no effects for derived state); step status is derived from checklist items with one shared function; static data (icon maps, metric config) is hoisted to module scope.
- **Rendering**: sparklines are plain SVG generated on the server with 1-decimal precision; the only per-second client work is `LiveClock`.
- **Event listeners**: `ProjectSwitcher` attaches document listeners only while open.

## 3b. Motion and interaction

- **One transition.** The `interactive` utility (`src/app/globals.css`) is the only transition the app
  uses for anything that responds to a press: named properties only (never `transition-all`, which
  animates layout properties off-GPU), 150 ms, a strong `ease-out` curve.
- **Nothing flashes.** `animate-ping` is gone — a live indicator uses `animate-pulse` or a static dot.
  The `Skeleton` is static, because a dozen pulsing blocks turned every navigation into a flicker.
  The timezone cookie no longer forces a re-render unless the calendar day actually differs.
- **Only `transform`/`opacity` animate.** The IoT switch moves its knob with `translate-x`, never
  `left`.
- **Anything that acts looks like it acts.** The base layer gives buttons, links, selects and
  switches a pointer cursor; disabled and `aria-disabled` elements keep their own.
- `design/` is excluded from Tailwind's scan (`@source not`), so the reference mockups' classes never
  reach the production CSS.
- **A mutation updates the screen at once.** The client pattern is optimistic state → `api()` →
  the section's own refetch. A section the user mutates owns its data: the server component passes
  the first value, the client keeps it and refetches **its own endpoint** (`useSectionData`).
- **`router.refresh()` is the heavy hammer**: it re-renders the whole route, so every section's
  queries run again. Reserve it for changes that cross sections (completing a day changes the
  progress chip, the milestone track and the day hero). A local change refetches one endpoint.
  A mutation that never updates the screen is the opposite bug: the list only changes on a reload.
- **Switching days animates.** The milestone track is a day picker: the node links to
  `?project=…&day=N` and `DayPlanFrame` (`src/components/today/`) slides the new day's plan in from
  the side the user travelled — 200 ms, transform + opacity, strong ease-out. The first render is
  still (nothing to animate from) and `prefers-reduced-motion` reduces it to a swap.

## 4a. Error handling

`api()` throws an `ApiError` carrying the server's error code (`not_found`, `validation_failed`,
`internal`, …) and its message; a request that never reached the server is a `network` error. The
studio keeps the failure as `{ action, code, detail }` and renders one banner (`PlanErrorNotice`)
with a plain-language reason, the server's detail and a **retry** that runs the failed action again.
The rest of the app shows the same one-line inline alert (`role="alert"`) next to the control that
failed.

## 5. Optimistic mutation flow

```
click → startTransition → apply(optimistic) → fetch /api/v1/... → reconcile the section
                                  │ on error: optimistic state auto-reverts + inline alert
```
The reducer in `StepsPanel` mirrors the server rule (`lib/steps.ts#statusFromItems`) so the optimistic and persisted states agree.

**Reconciling means "the section's own endpoint"**, not "the page": the steps panel pulls
`GET /projects/{id}/days/{day}` back, the purchase card pulls `GET /projects/{id}/supplies`, the finance
card pulls `GET /projects/{id}/expenses`. `router.refresh()` re-renders the whole route and every
section's queries with it, so it is reserved for changes that cross sections.

## 6. Data model (summary)

```
users 1─* blueprints  (a plan being shaped: payload jsonb, params jsonb, model, engine, status)
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
users 1─* blueprints  (a plan being shaped: payload jsonb, model, engine, status)
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
- `blueprints.payload` holds the whole plan as jsonb: an AI plan is not reproducible from the input
  and the user edits it by hand, so the draft is the source of truth until the project is created.

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
- **Another skill**: add a directory under `src/server/ai/skills/` with its `SKILL.md`, its tools and
  its validator, then register it in `skills/index.ts`. A skill owns its tools, its instruction and
  the rules the server enforces.
- **Better prices**: the bill of materials is an estimate (`priceSource: "ai_estimate"`) until the
  user types a price (`priceSource: "user"`, never scaled down). A price catalog table with a
  `lastVerifiedAt` column, or a `search_prices` / `url_context` tool, can be layered on without
  touching the plan structure.
- **Real-time sensors**: add `POST /api/v1/hubs/{id}/readings` (device token auth) writing to `sensor_readings` and updating `hubs.last_seen_at`; push to the UI with SSE or polling `router.refresh()`.

## 11. The plan-craft skill

The AI part of the studio is one skill, and it is meant to be read:

```
src/server/ai/skills/plan-craft/
  SKILL.md          the rules, in prose: the plan shape, what is forbidden, what each tool does
  system-prompt.ts  the system instruction, built from the rules and the constraint envelope
  tools.ts          the five tools: the JSON Schema the model reads and the Zod schema the server parses
  validate.ts       the checks: what is repaired, what is rejected
```

The flow is one turn:

```
POST /api/v1/blueprints
  └─ services/blueprint#generateBlueprint
       └─ ai/plan-craft#craftPlan
            ├─ turn 1: the model calls the tools (in parallel)
            ├─ the server validates, repairs and applies every call
            └─ turn 2 (only if a call was rejected): the model gets the error and may re-emit it
       └─ the plan is normalised and stored as a draft
```

The server is the oracle: the prompt makes the model aim for the rules, `validate.ts` and
`normalizeBlueprint` make sure they hold. Without an API key, a timeout or an unusable answer, the
template engine produces the same shape instead — the app never breaks.

