<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Actline — working notes

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict + `noUncheckedIndexedAccess` · Tailwind v4 · Drizzle + Postgres 17 · next-intl (cookie locale `vi`) · Zod 4 · `@google/genai` for the plan studio.

Product: `doc/requirement.md`. Architecture: `doc/architecture.md`. More detail: `CLAUDE.md`.
`design/` holds reference HTML mockups only — excluded from `tsconfig.json` and `eslint.config.mjs`.

## Setup

```bash
cp .env.example .env.local   # DATABASE_URL, DEMO_USER_EMAIL, GEMINI_API_KEY, GEMINI_MODEL, AI_PLAN_ENGINE, AI_TIMEOUT_MS, LOCAL_AI_*
npm install
npm run db:up                # Docker Postgres 17 on :5432 (needs a working Docker)
npm run db:migrate           # apply drizzle/*.sql
npm run db:seed              # demo user + demo projects
npm run dev
```

**A local model instead of Gemini.** Point the app at a model server that speaks the OpenAI API
(llama.cpp does):

```bash
AI_PLAN_ENGINE=local
LOCAL_AI_BASE_URL=http://localhost:9931/v1   # the API root
LOCAL_AI_MODEL=ggml-org/gpt-oss-20b-GGUF:MXFP4
```

`AI_PLAN_ENGINE` also takes a list — `local,gemini` tries the local model first and falls back to
the hosted one. The local server needs a context big enough for the whole plan (the system prompt
plus a plan of 6-10 nodes): `--ctx-size 16384` is a good floor, 4096 is not.

**`npm run db:seed` is destructive.** It deletes the demo user, which cascades to every project that
user owns — including projects you created in the app. Use it to get a clean demo state; it is not a
way to add data.

## Checks

```bash
npm run lint        # eslint (no --fix script)
npm run typecheck   # tsc --noEmit
npm run build
```

There is **no test runner and no test script** — don't look for one. A change is verified by
lint → typecheck → build plus a manual pass (`/`, `/new`, the REST endpoints under `/api/v1`).

## Schema changes

`src/server/db/schema.ts` → `npm run db:generate` → **commit `drizzle/*.sql` and `drizzle/meta/*`** →
`npm run db:migrate`. `db:push` syncs the database without producing a migration file; prefer
`db:generate` so the SQL is reviewable.

## Layering

`src/app/api/v1/**` route handlers and Server Components both call `src/server/services/**`, which own
the business logic and talk to Drizzle (`src/server/db`).

- Route handlers stay thin: `route()` (`src/server/api.ts`) resolves the user, maps Zod errors to 422
  and domain errors to 401/404/409. Dynamic routes need the params generic:
  `route<{ id: string }>(...)` + `uuid.parse(params.id)`.
- Every file under `src/server/**` starts with `import "server-only"`. Every service takes `userId`
  explicitly and checks ownership (`getProjectRow(userId, id)`, or the `owned*` joins in
  `services/mutations.ts`).
- Services are wrapped in `React.cache` for per-request dedupe — a service called from several
  sections runs its query once.
- Return DTOs from `src/lib/types.ts`; never hand raw DB rows to a client component.
- Mutations go through REST even from the web app (shared contract with a future mobile app). Client
  pattern: optimistic update → `api()` (`src/lib/api-client.ts`) → **update the screen**.
- **A section the user mutates owns its data**: the server component passes the first value, the
  client keeps it and refetches **its own endpoint** afterwards (`useSectionData`,
  `src/lib/use-section-data.ts`). Refetch one endpoint, not the page.
- **`router.refresh()` re-renders the whole route** — every section's queries run again (~30 on the
  home screen). Use it only when the change affects other sections (completing a day changes the
  progress chip, the milestone track and the day hero). For a local change it is wasted work.
  A mutation that never updates the screen is the opposite bug: the list only changes on a reload.
- `src/app/page.tsx` resolves the project id, then renders ~13 sections each inside its own
  `<Suspense>` with a fixed-height skeleton. Keep sections independent; use `Promise.all` for
  independent queries inside a service.
- Only interactive components are Client Components. No barrel files, no UI library.

## The plan studio (`/new`) — the AI part

The plan is a **tree**: a blueprint holds **nodes** (a range of days + one objective) and every node
holds **items** (one action item, pinned to a day). A day with no item is a valid state.

- **The app never talks to a model vendor.** `src/server/ai/architect.ts` is the interface: an
  `Architect` runs one turn with a system prompt and a user turn and answers with one JSON document
  (extracted from the prose; an unusable answer gets one correction turn fed with the problems).
  Everything else — the prompts, the document schema, the validation, the correction turn — belongs
  to the plan-craft skill and is shared by every engine.
- **The engines are implementations** (`src/server/ai/architects/`): `gemini.ts` (the hosted API,
  the conversation lives on its side), `openrouter.ts` and `local.ts` (any server that speaks the
  OpenAI Responses API — llama.cpp does — with the whole exchange replayed). A new engine is one
  file plus one line in
  `architects/index.ts`. `AI_PLAN_ENGINE` picks the engine, or a list (`local,gemini`) to try in
  order; `template` always uses the deterministic engine.
- The model crafts the plan by answering with **one JSON document** — the knobs it proposes
  (`constraints`) next to the whole plan (`nodes`, `supplies`, `risks`, `devices`, the plan's
  identity). The server validates and repairs every piece; what it cannot repair becomes a problem
  list and the model re-emits the whole document in a second turn. The rules live in
  `src/server/ai/skills/plan-craft/SKILL.md`; the document's Zod schemas are in `plan-schema.ts`,
  the checks in `validate.ts`.
- **The knobs are the AI's to choose.** `BlueprintParams` fields are `null` when the user left them
  open; the model proposes them inside the plan document and plans against them in the same breath.
  Whatever the user set by hand always wins.
- **`src/lib/blueprint.ts#normalizeBlueprint` is the single place that guarantees the plan's
  invariants** (nodes tile the project, items stay inside their node, a day never exceeds the daily
  time, the BOM fits the budget). If you add a field to the plan, normalise it there — the same pure
  function runs on the server and in the client for optimistic edits.
- Hand edits are **operations** (`src/lib/plan-ops.ts`) applied to the stored draft (`blueprints`
  table, jsonb payload), not to the project. `POST/PATCH/DELETE /api/v1/blueprints[/{id}]`.
- The template engine (`src/server/blueprint-templates.ts`) is the **fallback**: no API key, a timeout
  or an unusable answer falls back to it. The blueprint carries `engine: "ai" | "template"` and the UI
  shows which one produced the plan — keep that honest.
- `GEMINI_BASE_URL` points the Gemini client at another endpoint, so the whole pipeline (request
  shape, tool loop, repairs, fallback) can be exercised without a real key. `LOCAL_AI_BASE_URL` does
  the same for a local model server.

## Dates and timezones

- A project day is a **calendar date**: `dateOfProjectDay(start_date, day)` shifts by whole days, so
  it is timezone-independent. `projects.start_date` is a `date` column with `mode: "string"` — Drizzle
  hands you `"yyyy-mm-dd"`.
- **"Today" follows the device**, not a hardcoded zone: the root layout renders `ViewerTimezone`,
  which writes the browser's timezone into the `actline_tz` cookie, and `currentProjectDay` resolves
  the day in that timezone. `PROJECT_TZ` (`Asia/Ho_Chi_Minh`) is only the fallback for the first
  paint, before the cookie exists.
- Never format a date with `new Date()` directly; go through `src/lib/day.ts` / `isoDateInTz`.

## Conventions

- i18n: every string lives in `messages/vi.json` (and `messages/en.json`); no literals in
  components. A new **client** namespace must be added to `CLIENT_NAMESPACES` in
  `src/app/layout.tsx`, or the client component gets no messages. The locale is a cookie
  (`NEXT_LOCALE`); the header's `LocaleSwitcher` sets it and refreshes the route.
- Icons: Material Symbols loaded as a subset via `icon_names=`. A new icon name — including one
  stored in the DB or produced by the AI — must be added to `src/lib/icons.ts`, or it renders nothing.
- Data: UUID primary keys, money as integer VND, the current project day is derived (never stored),
  sensor ok/low/high is derived from `sensor_targets` at read time.
- IoT is optional per project (`projects.iot_enabled`). Every sensor / hub / camera / automation
  surface must be gated on it; plan, steps, supplies and finance must never depend on IoT data.
- Step status is derived from the checklist items by `lib/steps.ts#statusFromItems`; `StepsPanel`'s
  optimistic reducer mirrors that function — change both together. The panel reconciles against
  `GET /projects/{id}/days/{day}`, not against the page.
- Errors: `api()` throws an `ApiError` carrying the server's code; the studio shows one banner with
  a plain-language reason and a retry (`newProject.errors.*` in `messages/vi.json`).

## Motion and interaction

- **One transition.** Use the `interactive` utility (`src/app/globals.css`): named properties only,
  150 ms, strong ease-out. Never `transition-all` — it animates layout properties off-GPU.
- **No perpetual flashing.** `animate-ping` is gone; a live indicator uses `animate-pulse` or a static
  dot. The `Skeleton` is static: a dozen pulsing blocks turned every navigation into a flicker.
- **Animate `transform`/`opacity` only.** The IoT switch moves its knob with `translate-x`, never
  `left`.
- **Anything that acts looks like it acts.** The base layer already gives buttons, links, selects and
  switches a pointer cursor; disabled and `aria-disabled` elements keep their own cursor.
- The milestone track is a **day picker**: every node is a link to `?project=…&day=N` and the main
  column shows that day's plan. The nodes share one marker band so the track line runs through the
  circles, and the strip keeps the day you are looking at in view (it centres on the selected
  marker, not on today). `DayPlanFrame` slides the new day in from the side the user travelled (200 ms, transform
  + opacity) — the first render is still, and reduced motion swaps instead of slides.

## Gotchas

- `next dev` rewrites the `nextjs-agent-rules` block at the top of this file. Keep it in your diff.
- `npm run lint` does not autofix; run eslint yourself if you want fixes.
- `design/` is excluded from tsconfig and eslint — and from Tailwind's scan (`@source not`). Do not
  let the mockups' classes into the production CSS.
- No CI, no deploy config, no pre-commit hooks in this repo — don't wait for a pipeline to tell you
  something is broken.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
