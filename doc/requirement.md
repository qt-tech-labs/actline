# Actline: Home ("Hôm nay") requirements

Source design: `design/home/code.html` (screenshot: `design/home/screen.png`). Design tokens: `design/organic_momentum/DESIGN.md`.

## 1. Product summary

Actline is an **action planner**: it guides a person through any multi-day project (the reference project is a 45-day cucumber balcony garden; others could be planning a telepresence robot build or a home renovation) with a daily task list, supplies, budget and progress tracking. **IoT is an optional add-on, not a premise of the product**: a project can opt in to connect hardware (sensors, camera, valves) when it benefits from live data. The **Home** screen is the "Today execution hub": what to do today, what is coming next and, for IoT-enabled projects, how the plants and hardware are doing right now.

Primary user: a hobbyist/farmer working through a plan on a phone or desktop, often outdoors, who needs the next action at a glance and, for IoT-enabled projects, the live sensor context.

## 2. Scope

| In scope (this iteration) | Out of scope (shown disabled as "Sắp ra mắt") |
|---|---|
| Home screen, responsive desktop and mobile | Other nav tabs: Dòng thời gian, Kho vật tư, Nhật ký ảnh |
| PostgreSQL schema, seed data, versioned REST API | Empty state variants |
| Optimistic step/checklist/rule/day mutations | Notifications, help, settings, account menu |
| Quick note and incident report | Live video stream, snapshot AI, time-lapse, fullscreen |
| Optional IoT per project (FR-9) and the IoT settings modal (FR-10, `design/iotconfig-modal`) | Wi-Fi rescan, sensor calibration, per-pin configuration, camera stream test |
| Vietnamese UI, i18n-ready | Photo upload, technical clip playback |
| | Authentication, device ingestion endpoint, delivering queued hub commands to the device |
| New-project studio (`design/new`, FR-12) | |

## 3. Functional requirements

### FR-1 App header
- FR-1.1 Show brand, a project switcher (current project name + dropdown of active projects), primary nav, utility buttons and the user avatar.
- FR-1.2 Selecting a project reloads Home for that project (`/?project=<id>`). Default is the user's first active project.
- FR-1.3 Nav tab "Hôm nay" is active. Other tabs, notifications, help and settings are visibly present but disabled with a "coming soon" tooltip.
- FR-1.4 On `< md` the nav tabs are replaced by a bottom navigation bar (Hôm nay, Live Cam, Cảm biến, Vật tư, Thêm). Live Cam and Cảm biến scroll to their sections and are hidden when the project has no IoT.

### FR-2 Progress sub-header (sticky under the header)
- FR-2.1 Progress chip: `Tiến độ: {day}/{total} ngày ({pct}%)` and the current stage name (e.g. "Giai đoạn 2: Ra hoa & Thụ phấn tập trung").
- FR-2.2 IoT hub chip (**only for IoT-enabled projects**, see FR-9): hub name, online pulse, battery %, relative last-sync time, location, and a settings button that opens the IoT settings modal (FR-10).
- FR-2.3 Milestone timeline, horizontally scrollable with previous/next buttons. Every node shows its
  day code **and** its calendar date (`N16 · 20/10`, dd/MM) and opens the plan of that day: the
  actions with their minutes and checklists, plus the supplies used that day.
- FR-2.3b **The dates follow the device.** "Today" and the calendar date of a milestone are resolved
  in the timezone of the device the user browses from, not a fixed one.
  - Done milestones: filled circle with check, code `Nxx`, short label.
  - Minor milestones: small tick, tooltip only.
  - Today: highlighted pill `Nxx • Hôm nay` with ping animation, centred on first paint.
  - Upcoming: numbered or icon circle; `shopping` kind uses the secondary colour, `target` kind (final harvest) shows a flag.
  - Solid track up to today, dashed track after.
- FR-2.4 The current project day is derived from the project start date and today's date in the project timezone (`Asia/Ho_Chi_Minh`), clamped to `[1, totalDays]`.
- FR-2.5 **Hub disconnected** (`design/home/noconnect`): when the hub is offline the chip turns red — hub name, `OFFLINE` badge, how long the signal has been lost, the location and a "Kết nối lại" action that opens the IoT settings (FR-10).

### FR-3 Sensor metric cards
Rendered only for IoT-enabled projects; otherwise the section is omitted (no empty placeholder).

Five cards: air temperature, air humidity, soil moisture, substrate pH, light intensity.
- FR-3.1 Each card shows the latest value, the target range, a sparkline of readings from day 1 to today with the target band, the average, and a gauge bar.
- FR-3.2 Status is computed from the target range: inside range = OK (green check); below/above = warning (secondary colour, pulsing warning icon, status text replaces the range).
- FR-3.3 Cards are 2 columns on mobile, 3 on `md`, 5 on `xl`.
- FR-3.4 If there are no readings, show an explanatory empty message.
- FR-3.5 **Hub disconnected**: a red banner above the cards (hub name, time the signal was lost, the time of the last stored reading, "Kiểm tra Gateway" and "Cấu hình kết nối IoT"). Every card then shows `--.-` instead of a live value, the last stored value as context, the reason ("Mất tín hiệu", or "Không phản hồi" for the probes) and when it was stored.

### FR-4 Left column
- FR-4.1 **Projects list**: active projects with icon and current day code; active one highlighted. Add button disabled.
- FR-4.2 **Live camera** (IoT-enabled projects only): image, resolution/fps badge, label, ticking live clock (project timezone), AI insight line with `**bold**` highlights. Snapshot/time-lapse/fullscreen disabled.
- FR-4.3 **IoT hardware** (IoT-enabled projects only): devices with status dot or display value (e.g. soil probe `42%`, valve schedule `16:30`) and an `{online}/{total} trực tuyến` badge.
- FR-4.4 **Hub disconnected**: the live camera shows a `MẤT LUỒNG RTSP` header, a dimmed still with a reconnect overlay (attempt counter, "Thử kết nối lại") and the last snapshot marked as stale; the hardware card turns red, shows `0/{total} phản hồi`, the gateway as "Mất kết nối", probes as "Không phản hồi", the valve in "Chế độ thủ công", plus a "Cấu hình kết nối IoT" action.

### FR-5 Center column: today's execution
- FR-5.1 **Day hero**: `{day}/{total} ngày` badge, today's date (dd/MM), golden time window, "Ghi chép nhanh" button, day title, summary, AI hint with confidence.
- FR-5.1b **Hub disconnected**: the day hero shows a red `SAFE MODE` banner — the plan continues locally while the sensors are unreachable, and the app waits for the next sync.
- FR-5.2 **Step list**, ordered, each step in one of three states:
  - `todo`: empty checkbox, estimate chip.
  - `doing`: highlighted border, "Đang làm" chip, optional checklist, optional clip/camera shortcuts.
  - `done`: checked, struck-through title, completion time (HH:mm).
  - A step may require a photo: upload slot (disabled) plus existing photos.
- FR-5.3 Checking a step toggles done/todo. Checking checklist items derives the step status: none = todo, some = doing, all = done.
- FR-5.4 **Completion banner**: `Đã xong {n}/{total} bước • {plan title}` and "Đánh dấu hoàn thành ngày". After completion the button is disabled and the title changes to "Đã hoàn thành ngày {day}".
- FR-5.5 All changes appear immediately (optimistic) and roll back with an error message if the request fails.
- FR-5.5b **Failures are explained.** An error shows what failed in plain language, the detail the
  server returned (when there is one) and a "retry" action that runs the same request again.
- FR-5.5c **A day cannot be closed while work is open.** The "mark the day as done" action is
  refused until every action item of that day is finished, and the button says how many are left.
- FR-5.6 If there is no plan for today, show an explanatory empty card.
- FR-5.7 **Quick note**: dialog with a textarea; saves a note against project and day.

### FR-6 Right column
- FR-6.1 **The purchase list**: every planned item of the project with its planned price, the day
  it is bought by, and whether it was bought. The user can add a purchase the plan did not foresee,
  correct the price actually paid, tick an item as bought and remove it. The card shows the
  estimated total, what was really spent and how many items are still to buy.
- FR-6.1b **A purchase and the money log move together**: ticking an item as bought records the
  expense; unticking it removes it.
- FR-6.2 **Finance**: spent, expected revenue, spent-vs-revenue bar with remaining budget reserve, estimated net profit (green/red). Below it the money log: every cost and income entry with its day, addable and removable by hand, plus the budget and the expected revenue. The result of the project is the profit: money in plus the expected revenue, minus everything spent.
- FR-6.2b **The next run**: a finished project can be cloned into a new one — the same plan, a
  fresh day 1 and a clean ledger, with the prices the last run actually paid as the new estimates.
- FR-6.3 **Automation rules** (IoT-enabled projects only, since rules act on sensor conditions): name, condition, on/off switch (optimistic, persisted); count of enabled rules. While the hub is disconnected the card adds the "Hệ thống tự ngắt an toàn" footer.
- FR-6.4 **Next 2 days**: upcoming day titles with total estimated minutes; the next day is labelled "Mai".

### FR-7 Incident report
- FR-7.1 A floating "Báo sự cố" button is always visible (above the bottom nav on mobile).
- FR-7.2 It opens a dialog with severity (nhẹ / trung bình / khẩn cấp) and a description; submitting saves an incident.

### FR-8 Project layout without IoT
- FR-8.1 For a project with IoT disabled, Home shows only the non-IoT sections: progress and milestone timeline, today's execution (FR-5), supplies, finance, next 2 days, quick note and incident report. Sensor cards, live camera, hardware list, automation rules and the hub chip are not rendered, and the grid reflows without gaps.
- FR-8.2 The project switcher and projects list work identically for both kinds of project.

### FR-9 IoT is optional per project
- FR-9.1 Each project has an `iot_enabled` flag (default `false`). All IoT features in this document apply only when it is `true`.
- FR-9.2 **Create-project flow**: the flow asks whether the project needs IoT. It does not force a choice; it **suggests** enabling IoT when the project looks sensor-driven (e.g. a garden, greenhouse or aquarium template, or the user mentions sensors, irrigation or cameras) and does not suggest it otherwise (e.g. planning a telepresence robot or a renovation, where IoT is not required). The user can always accept or decline the suggestion.
- FR-9.3 IoT can be enabled later from the project (the hub chip is replaced by a "Connect IoT" call to action) and disabled again; disabling hides IoT UI but keeps hub, device and reading data so re-enabling restores it.
- FR-9.4 IoT API endpoints (`/projects/{id}/hub*`, readings) return 404 `not_found` for a project with IoT disabled.
- FR-9.5 Nothing outside the IoT surface may depend on IoT data: plan, steps, supplies, finance and milestones work with no hub.

### FR-10 IoT settings modal (`design/iotconfig-modal`)
Opened from the hub chip's settings button (FR-2.2). Loads the hub configuration each time it opens.
- FR-10.1 **Network**: hub online state, firmware version and chip, Wi-Fi SSID / signal strength (dBm and quality) / IP / MAC, MQTT broker host and port (editable) with auth mode, client id and connection state, BLE readiness, flash size and uptime.
- FR-10.2 **Hardware pinout**: one row per physical port (port label, channel, signal type I2C / analog / digital output, description) showing the latest reading, plus a camera row with an editable RTSP URL (`rtsp://` or `rtsps://`). Credentials in the URL are masked in every API response (`rtsp://user:***@host`); saving a masked URL keeps the stored password.
- FR-10.3 **Firmware and safety settings**: telemetry interval (15 / 30 / 60 s), light-sleep below 20% battery, and the valve hardware watchdog (cut the valve if Wi-Fi/MQTT drops or it stays open over 5 minutes).
- FR-10.4 **Actions**: "Ping" reports whether the hub's last heartbeat is recent (under 2 minutes) and how old it is; "Test van 5s" queues a 5-second valve command for the device (409 if the hub is offline; repeated clicks while one is queued do not stack); "Khôi phục mặc định" resets the editable settings in the form without saving; "Lưu cấu hình & Áp dụng" validates and persists, then refreshes the page; "Hủy bỏ" discards edits.
- FR-10.5 Wi-Fi rescan, sensor calibration, per-pin configuration and camera stream test are shown disabled with a "Sắp ra mắt" tooltip.
- FR-10.6 Validation: broker host `[A-Za-z0-9.-]+`, port 1-65535, RTSP URL scheme; invalid fields block saving.

### FR-11 REST API (for the web app and future mobile apps)
Base path `/api/v1`, JSON envelope `{ "data": ... }` or `{ "error": { "code", "message" } }`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/projects` | Active projects |
| GET | `/projects/{id}/today` | Whole Home payload in one call |
| GET | `/projects/{id}/days/{day}` | The plan of one project day (the review dialog of the milestone track) |
| POST | `/projects` | Create a project from an idea: `{ prompt, totalDays, dailyMinutes, budgetVnd, experience, iotEnabled?, ownedSupplies?, blueprintId? }` (201) |
| GET/POST | `/projects/{id}/supplies` | The purchase list; add a purchase |
| PATCH/DELETE | `/projects/{id}/supplies/{supplyId}` | Edit a purchase (price, bought, day); remove it |
| GET/POST | `/projects/{id}/expenses` | The money log; record a cost or an income |
| DELETE | `/projects/{id}/expenses/{expenseId}` | Remove an entry |
| PATCH | `/projects/{id}/finance` | Adjust the budget or the expected revenue |
| POST | `/projects/{id}/clone` | Start the next run of this project (201) |
| POST | `/blueprints` | Craft (and remember) the plan for an idea: same body without `ownedSupplies` → `{ id, blueprint }` |
| GET | `/blueprints/{id}` | The plan being shaped |
| PATCH | `/blueprints/{id}` | Hand edits on the plan: `{ ops: [...] }` → the updated plan |
| POST | `/projects/{id}/days/{day}/complete` | Mark a day complete |
| POST | `/projects/{id}/notes` | `{ day, body }` |
| POST | `/projects/{id}/incidents` | `{ severity, body }` |
| PATCH | `/steps/{id}` | `{ status: todo\|doing\|done }` |
| PATCH | `/step-items/{id}` | `{ done }` |
| PATCH | `/automation-rules/{id}` | `{ enabled }` |
| GET | `/projects/{id}/hub` | Hub settings, pins and latest readings (IoT projects only) |
| PATCH | `/projects/{id}/hub` | `{ telemetryIntervalSec, lightSleepLowBattery, valveWatchdog, mqtt: { host, port }, cameraUrl }` |
| POST | `/projects/{id}/hub/ping` | Heartbeat check: `{ online, ageSeconds }` |
| POST | `/projects/{id}/hub/commands` | `{ kind: "valve_test" }`, queues a command (202) |

Status codes: 200/201/202 success, 400 bad JSON, 401 no user, 404 not found or not owned, 409 conflict (e.g. hub offline), 422 validation.

### FR-12 New-project studio (`design/new`, route `/new`)
- FR-12.1 Three parts: the idea generator (free text + sample plans + duration, daily time, budget and experience knobs), the live plan and a persistent action bar.
- FR-12.1b **The knobs are the AI's to choose.** Duration, daily time, budget and experience are
  open by default: the right values depend on the topic, so the model proposes them (and the knob
  shows its proposal). A value the user sets by hand always wins and is never overridden.
- FR-12.2 **The plan is a tree of nodes.** A *node* is a group of work with a time range and an objective; an *item* is one action item pinned to a day. The plan is made of 6–10 nodes covering the whole project without gaps or overlaps, and every day may have zero or more items.
- FR-12.3 **The plan is crafted by AI.** The idea and the knobs become a constraint envelope (days, minutes a day, budget, experience) and the model builds the plan by calling tools: `create_node`, `add_supply`, `add_risk`, `add_device`, `finalize_plan`. The server validates every call and repairs what it can (day ranges, minutes, icons, prices); a call that cannot be repaired is sent back to the model for another attempt. Without an API key or on a timeout, a deterministic template plan is used instead — the screen never breaks.
- FR-12.4 **The rules the plan follows**: no filler work (a day without an item is correct when the objective is waiting or curing), every item inside its node's range, a day never longer than the user's daily time, prices in VND inside the budget, icons from the app's icon set, all copy in Vietnamese, IoT only suggested for sensor-driven projects, the golden time window only on day 1.
- FR-12.5 **The plan on screen is remembered** as a stored draft, so a reload keeps the same plan; the knobs only change it after the plan is regenerated.
- FR-12.6 **The user edits the plan by hand**: add, edit or delete a node; add, edit or delete an action item on any day (an empty day offers an "add" button); add, edit or delete a supply and correct its price (a price the user types is never scaled down). Edits are applied as a batch of operations and the plan is re-normalised, so its invariants always hold.
- FR-12.7 The IoT kit is a suggestion: the user can accept or decline it, and the project can still be connected later (FR-9.3).
- FR-12.8 "Bắt đầu dự án" creates the project (stages, one day plan per project day with its action items and checklists, shopping steps, supplies, milestones, an AI insight, and a hub with devices when IoT is on) and opens it; "Lưu bản nháp" keeps the plan without creating anything; the BOM can be downloaded as CSV and items can be ticked off as already owned.

## 4. Non-functional requirements

- **NFR-1 Fidelity**: layout, colours, type scale and spacing follow the design tokens (Organic Momentum: Space Grotesk / Manrope / JetBrains Mono, green primary, amber secondary, warm surface).
- **NFR-2 Responsive**: usable from 360 px wide; 12-column grid (3/6/3) from `lg`.
- **NFR-3 Performance**: sections stream independently behind Suspense; no request waterfalls; only client components where interaction needs them; icon font is a subset of the glyphs used.
- **NFR-4 Accessibility**: semantic landmarks and headings, visible keyboard focus, `role="checkbox"`/`switch` with labels, `aria-live` for progress, native `<dialog>` (focus trap, Esc), `prefers-reduced-motion` respected, status never conveyed by colour alone (text/sr-only labels).
- **NFR-5 i18n**: all UI copy lives in `messages/<locale>.json`; Vietnamese now, English addable without touching components. Dates/numbers/relative times use locale-aware formatters.
- **NFR-6 Security**: every mutation verifies the resource belongs to the current user; inputs validated with Zod; no secrets in client bundles (`server-only`).
- **NFR-7 Portability**: all business logic sits in a service layer independent of React so mobile clients use the same REST contract.

## 5. Data requirements

Projects carry an `iot_enabled` flag (FR-9). Entities: users, projects, project stages, milestones, day plans, steps, step checklist items, step photos, supplies, expenses, IoT hubs (with their JSON configuration), hub commands, devices, sensor readings, sensor targets, AI insights, automation rules, notes, incidents. See `src/server/db/schema.ts`.

Seed (`npm run db:seed`): demo user `demo@actline.app` and the "Vườn dưa leo ban công Nhật" project, positioned on **day 16 of 45** relative to the seed date, with figures from the design (845,000 đ spent, 2,400,000 đ expected revenue, 1.2M budget, 4 hardware devices, 3 automation rules, 32 readings per sensor).

## 6. Acceptance criteria

1. With the DB seeded, `/` renders all sections with the design's data and no console errors.
2. Ticking a checklist item updates the step state and "Đã xong n/total" immediately and persists after reload.
3. Toggling a rule persists; the "n bật" count updates.
4. "Đánh dấu hoàn thành ngày" persists and disables itself.
5. Quick note and incident dialogs save rows and confirm success.
6. Soil moisture below its range shows the warning style; others show OK.
7. `GET /api/v1/projects/{id}/today` returns the same data the page shows.
8. Switching project via the header or the list changes the page content.
9. Layout works at 360 px, 768 px and 1440 px; keyboard-only operation is possible.
10. `npm run lint`, `npm run typecheck` and `npm run build` pass.
11. A project with IoT disabled shows no IoT section, chip or nav entry, and no IoT request is made (FR-8, FR-9).
12. In the IoT settings modal, editing and saving the interval, toggles, broker and camera URL persists after reload; an invalid port or RTSP URL blocks saving; the stored camera password is never returned by the API.

## 7. Known limitations / open items

- Content stored in the database (step titles, milestone labels, AI text) is not translated; a second language needs `*_i18n` columns or translation tables.
- The plan-craft skill needs a `GEMINI_API_KEY`; without one the studio falls back to the deterministic template plan, which only knows a handful of project kinds.
- The prices in the bill of materials are estimates. The user can correct them by hand; a price catalog (or a live lookup) is not built yet.
- `projects.iot_enabled`, the create-project IoT suggestion and the non-IoT Home layout (FR-8, FR-9) are specified here but not yet implemented; today every project with a hub is treated as IoT-enabled.
- Queued hub commands (`hub_commands`) have no consumer until the device ingestion endpoint exists; the valve test only records the request.
- Hub "last sync" is a stored timestamp; a real ingestion endpoint is needed to keep it live.
- The seeded project's day advances with the calendar; plans exist only for days 16-18.
- Auth is a single seeded demo user behind `getCurrentUser()`.
