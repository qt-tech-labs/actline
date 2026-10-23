# Graph Report - actline  (2026-10-23)

## Corpus Check
- 158 files · ~351,293 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 873 nodes · 2429 edges · 63 communities (40 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `36afa504`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Shared UI Foundation
- Home & Project Sections
- Database Schema & Migrations
- Milestone & Metric Components
- Plan-Craft Validation
- Schema & Data Layer
- Hub Settings Service
- Core Service Registry
- Blueprint Generation Route
- Blueprint Ops Engine
- Blueprint Normalizer
- Plan-Craft Skill Assets
- Shared Route Harness
- Root Layout & Toasts
- TypeScript Config
- AI Plan Pipeline
- Local AI Engine
- Debug Panel UI
- Debug Run Service
- Demo Seed Script
- Package Manifest
- Expense & Note Routes
- Offline Blueprint Templates
- Architect & Gemini Engine
- Blueprint Draft Store
- Step Items & Rules Routes
- Runtime Dependencies
- Dev Dependencies
- NPM Scripts
- OpenRouter Engine
- IoT Device Concepts
- Locale Switching
- Product & Skill Docs
- Architecture & Agent Docs
- Supply Purchase Routes
- Supply Update Routes
- Project Creation Route
- New Studio Screenshots
- Finance Update Route
- Incident Reporting
- OpenRouter Web Tools
- ESLint Config
- OpenRouter Armor & Bash
- OpenRouter Function Tools
- OpenRouter Reasoning Tools
- PostCSS Config
- Home Empty Concept
- Empty State Concept
- OpenRouter Advisor Tool
- OpenRouter API Errors
- OpenRouter Code Interpreter
- OpenRouter File Search
- OpenRouter Image Gen
- OpenRouter MCP Tool
- OpenRouter Metadata
- OpenRouter Provider Options
- OpenRouter Subagent Tool
- OpenRouter Usage
- README

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 95 edges
2. `cn()` - 64 edges
3. `next-intl` - 52 edges
4. `react` - 41 edges
5. `parseBody()` - 31 edges
6. `next` - 27 edges
7. `server-only` - 25 edges
8. `route()` - 24 edges
9. `getCurrentUser` - 22 edges
10. `zod` - 21 edges

## Surprising Connections (you probably didn't know these)
- `IoT Offline State UI` --references--> `src/app/api/v1/**`  [INFERRED]
  design/home/noconnect/screen.png → AGENTS.md
- `Skill: plan-craft` --references--> `OpenRouter Server Tools`  [INFERRED]
  src/server/ai/skills/plan-craft/SKILL.md → doc/openrouter.md
- `Skill: plan-craft` --conceptually_related_to--> `Actline: Home Requirements`  [INFERRED]
  src/server/ai/skills/plan-craft/SKILL.md → doc/requirement.md
- `New Project Studio UI Screenshot` --semantically_similar_to--> `Actline - Tạo Dự Án Mới Bằng Ý Tưởng AI`  [EXTRACTED] [semantically similar]
  design/new/screen.png → design/new/code.html
- `New Project Studio Page` --implements--> `Actline - Tạo Dự Án Mới Bằng Ý Tưởng AI`  [INFERRED]
  doc/architecture.md → design/new/code.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AI Plan Studio Flow** — src_server_ai_architect, src_lib_blueprint, src_server_services [EXTRACTED 0.90]
- **Design System Implementation** — design_organic_momentum_design_md, design_new_code_html, design_new_screen_png [EXTRACTED 0.95]
- **AI Plan Generation Flow** — src_server_ai_skills_plan_craft_skill, plan_craft_blueprint, doc_requirement [EXTRACTED 0.95]
- **AI Planning Flow** — src_server_ai_skills_plan_craft, src_server_ai_architect_ts, src_lib_blueprint_ts [EXTRACTED 1.00]
- **IoT Hardware Integration Stack** — esp32_hub_v2, sht31_sensor, soil_moisture_sensor, ph_probe, solenoid_valve [EXTRACTED 1.00]
- **IoT System Architecture** — iot_enabled_feature, doc_requirement, actline_app [EXTRACTED 1.00]
- **OpenRouter Built-in Server Tools** — doc_openrouter_advisor_server_tool_openrouter, doc_openrouter_subagent_server_tool_openrouter, doc_openrouter_fusion_server_tool_openrouter, doc_openrouter_bash_server_tool, doc_openrouter_image_generation_server_tool_openrouter [EXTRACTED 1.00]
- **OpenRouter Built-in Server Tools** — doc_openrouter_web_search_server_tool, doc_openrouter_subagent_server_tool, doc_openrouter_fusion_server_tool, doc_openrouter_bash_server_tool [EXTRACTED 1.00]
- **Dashboard UI States** — design_home_code, design_home_empty_code, design_home_noconnect_code [INFERRED 0.80]
- **IoT Integration Stack** — docker_compose_yml, src_server_services, design_home_noconnect_screen [INFERRED 0.80]
- **Observability and Tracing Flow** — doc_openrouter_usage, doc_openrouter_stream_events, doc_openrouter_api_error_type [INFERRED 0.85]
- **API Error and Status Flow** — doc_openrouter_api_error_type [INFERRED 0.90]

## Communities (63 total, 23 thin omitted)

### Community 0 - "Shared UI Foundation"
Cohesion: 0.06
Nodes (85): nextConfig, withNextIntl, next, next-intl, react, NewProjectPage(), EmptyState(), HomePage() (+77 more)

### Community 1 - "Home & Project Sections"
Cohesion: 0.17
Nodes (15): body, GET, POST, GET, currentProjectDay(), isoDateInTz(), PROJECT_TZ, TZ_COOKIE (+7 more)

### Community 2 - "Database Schema & Migrations"
Cohesion: 0.08
Nodes (34): "ai_insights", "automation_rules", "day_plans", "devices", devices_hub_idx, "expenses", expenses_project_idx, "hubs" (+26 more)

### Community 3 - "Milestone & Metric Components"
Cohesion: 0.08
Nodes (23): METRIC_CONFIG, METRIC_ORDER, AutomationRuleDto, BlueprintCheckpoint, BlueprintRisk, BlueprintTag, CameraDto, DayPlanDto (+15 more)

### Community 4 - "Plan-Craft Validation"
Cohesion: 0.16
Nodes (19): EXPERIENCE_LEVELS, constraintsSchema, deviceSchema, itemSchema, metaSchema, nodeSchema, riskSchema, supplySchema (+11 more)

### Community 5 - "Schema & Data Layer"
Cohesion: 0.07
Nodes (50): drizzle-orm, server-only, GET, dateOfProjectDay(), hhmm(), Db, globalForDb, aiInsights (+42 more)

### Community 6 - "Hub Settings Service"
Cohesion: 0.12
Nodes (33): POST, GET, Params, PATCH, CameraRow(), FirmwareSection(), HubSettingsDialog(), HubSettingsForm() (+25 more)

### Community 7 - "Core Service Registry"
Cohesion: 0.07
Nodes (42): DeleteProjectButton(), remove(), checklistLines(), DayBrowser(), ItemForm(), ItemValues, pad(), Busy (+34 more)

### Community 8 - "Blueprint Generation Route"
Cohesion: 0.24
Nodes (11): dayRangeLabel(), phaseRanges(), clamp(), generateTemplateBlueprint, newItemId(), pickTemplate(), roundTo1000(), scaleDayOne() (+3 more)

### Community 9 - "Blueprint Ops Engine"
Cohesion: 0.09
Nodes (23): addCheckpointOpSchema, addDeviceOpSchema, addItemOpSchema, addNodeOpSchema, addSupplyOpSchema, applyBlueprintOps(), blueprintOpSchema, blueprintOpsSchema (+15 more)

### Community 10 - "Blueprint Normalizer"
Cohesion: 0.17
Nodes (15): Home Dashboard UI, blueprintParamsSchema, clamp(), CONTINGENCY_RATIO, FALLBACK_PARAMS, mockPlanSchema, normaliseSupplies(), normalizeBlueprint() (+7 more)

### Community 11 - "Plan-Craft Skill Assets"
Cohesion: 0.13
Nodes (19): BlueprintConstraints, BlueprintExperience, BlueprintParams, buildBlueprint(), craftPlan(), CraftResult, mergeRepairs(), withTimeout() (+11 more)

### Community 12 - "Shared Route Harness"
Cohesion: 0.26
Nodes (10): POST, GET, Ctx, User, AiUnavailableError, ConflictError, NotFoundError, UnauthorizedError (+2 more)

### Community 13 - "Root Layout & Toasts"
Cohesion: 0.18
Nodes (10): CLIENT_NAMESPACES, jetbrainsMono, manrope, RootLayout(), spaceGrotesk, viewport, ViewerTimezone(), ToastProvider() (+2 more)

### Community 14 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 15 - "AI Plan Pipeline"
Cohesion: 0.24
Nodes (9): @google/genai, ArchitectTurn, extractJson(), AI_TIMEOUT_MS, gemini(), GEMINI_MODEL, hasGeminiKey(), InteractionLike (+1 more)

### Community 16 - "Local AI Engine"
Cohesion: 0.19
Nodes (11): ArchitectRequest, buildInput(), LOCAL_AI_API_KEY, LOCAL_AI_BASE_URL, LOCAL_AI_MAX_OUTPUT_TOKENS, LOCAL_AI_MODEL, LOCAL_AI_TIMEOUT_MS, LocalInputItem (+3 more)

### Community 17 - "Debug Panel UI"
Cohesion: 0.26
Nodes (12): react-json-view, BADGE_TONE, Block(), DebugPanel(), JsonBlock(), JsonTree(), ReactJson, RequestBlock() (+4 more)

### Community 18 - "Debug Run Service"
Cohesion: 0.18
Nodes (14): dynamic, GET(), dynamic, GET(), currentTurn, debugEnabled(), DebugRun, DebugTurn (+6 more)

### Community 19 - "Demo Seed Script"
Cohesion: 0.23
Nodes (16): HubConfig, client, db, DEMO_HUB_CONFIG, localDate(), main(), phaseFor(), rng() (+8 more)

### Community 20 - "Package Manifest"
Cohesion: 0.12
Nodes (14): name, private, version, drizzle-kit, eslint, postgres, react-dom, tailwindcss (+6 more)

### Community 21 - "Expense & Note Routes"
Cohesion: 0.08
Nodes (45): zod, body, PATCH, POST, DELETE, body, PATCH, body (+37 more)

### Community 22 - "Offline Blueprint Templates"
Cohesion: 0.13
Nodes (14): AQUARIUM, BLUEPRINT_TEMPLATES, BlueprintTemplate, DIORAMA, FALLBACK_TEMPLATE, GARDEN, GENERIC, MARATHON (+6 more)

### Community 23 - "Architect & Gemini Engine"
Cohesion: 0.21
Nodes (10): PLAN_PROVIDERS, BlueprintProvider, Architect, GeminiArchitect, ARCHITECT_KEYS, ARCHITECTS, defaultPlanProvider(), planEngines() (+2 more)

### Community 24 - "Blueprint Draft Store"
Cohesion: 0.19
Nodes (16): GET, PATCH, createBody, POST, blueprintInputSchema, readBlueprintId(), blueprints, createProject() (+8 more)

### Community 25 - "Step Items & Rules Routes"
Cohesion: 0.29
Nodes (9): groupByPhase(), MilestoneTimeline(), NodeView(), pad(), Section, PHASE_COLORS, phaseColor(), TimelineNode (+1 more)

### Community 26 - "Runtime Dependencies"
Cohesion: 0.18
Nodes (11): dependencies, drizzle-orm, @google/genai, next, next-intl, postgres, react, react-dom (+3 more)

### Community 27 - "Dev Dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, drizzle-kit, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+3 more)

### Community 28 - "NPM Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, db:generate, db:migrate, db:push, db:seed, db:up, dev (+3 more)

### Community 29 - "OpenRouter Engine"
Cohesion: 0.24
Nodes (9): buildInput(), InputItem, OPENROUTER_BASE_URL, OPENROUTER_MODEL, OPENROUTER_TIMEOUT_MS, OpenRouterArchitect, readText(), ResponsesPayload (+1 more)

### Community 30 - "IoT Device Concepts"
Cohesion: 0.20
Nodes (10): AI Camera Insight Engine, Actline Smart Dashboard, Actline Offline State, IoT Configuration Modal, IoT Config UI Screenshot, ESP32 Hub v2 (Master Gateway), pH Electrode Probe, SHT31 Air Temp/Humidity Sensor (+2 more)

### Community 31 - "Locale Switching"
Cohesion: 0.36
Nodes (6): defaultLocale, isLocale(), Locale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, locales

### Community 32 - "Product & Skill Docs"
Cohesion: 0.22
Nodes (8): Actline Application, OpenRouter API Documentation, openrouter:subagent, OpenRouter Server Tools, Actline: Home Requirements, IoT Integration, Plan Blueprint, Skill: plan-craft

### Community 33 - "Architecture & Agent Docs"
Cohesion: 0.29
Nodes (6): doc/architecture.md, doc/requirement.md, Blueprint Normalizer, Architect Interface, Plan-Craft Skill, Database Schema

### Community 34 - "Supply Purchase Routes"
Cohesion: 0.31
Nodes (9): POST, blueprintGenerationSchema, resolveParams(), architectFor(), writeBlueprintId(), recordTurns(), generateBlueprint(), mockBlueprint() (+1 more)

### Community 35 - "Supply Update Routes"
Cohesion: 0.43
Nodes (6): body, DELETE, PATCH, ownedSupply(), removeSupply(), updateSupply()

### Community 36 - "Project Creation Route"
Cohesion: 0.33
Nodes (5): DELETE, DEFAULT_PARAMS, DEFAULT_PROMPT, BlueprintInput, clearBlueprintId()

### Community 37 - "New Studio Screenshots"
Cohesion: 0.50
Nodes (4): Actline - Tạo Dự Án Mới Bằng Ý Tưởng AI, New Project Studio UI Screenshot, Organic Momentum Design System, New Project Studio Page

### Community 40 - "OpenRouter Web Tools"
Cohesion: 0.67
Nodes (3): Fusion Server Tool, Fusion Server Tool, Web Search Server Tool

### Community 62 - "README"
Cohesion: 0.67
Nodes (3): IoT Offline State UI, src/app/api/v1/**, src/server/services/**

## Knowledge Gaps
- **48 isolated node(s):** `react-dom`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 287 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `server-only` connect `Schema & Data Layer` to `Home & Project Sections`, `Project Creation Route`, `Hub Settings Service`, `Plan-Craft Skill Assets`, `Shared Route Harness`, `AI Plan Pipeline`, `Local AI Engine`, `Debug Run Service`, `Package Manifest`, `Expense & Note Routes`, `Offline Blueprint Templates`, `Architect & Gemini Engine`, `Blueprint Draft Store`, `OpenRouter Engine`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `react-dom`, `@tailwindcss/postcss`, `@types/node` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Foundation` be split into smaller, more focused modules?**
  _Cohesion score 0.06307997080596392 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Shared UI Foundation` to `Home & Project Sections`, `Schema & Data Layer`, `Hub Settings Service`, `Core Service Registry`, `Shared Route Harness`, `Debug Panel UI`, `Package Manifest`, `Blueprint Draft Store`, `Step Items & Rules Routes`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `Database Schema & Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Shared UI Foundation` to `Hub Settings Service`, `Core Service Registry`, `Root Layout & Toasts`, `Debug Panel UI`, `Step Items & Rules Routes`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Milestone & Metric Components` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._