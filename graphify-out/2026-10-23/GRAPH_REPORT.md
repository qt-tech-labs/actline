# Graph Report - actline  (2026-10-23)

## Corpus Check
- 0 files · ~351,639 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 892 nodes · 2477 edges · 63 communities (41 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

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
10. `getProjectOverview` - 21 edges

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

## Communities (63 total, 22 thin omitted)

### Community 0 - "Shared UI Foundation"
Cohesion: 0.05
Nodes (95): nextConfig, withNextIntl, next, next-intl, react, NewProjectPage(), CameraRow(), FirmwareSection() (+87 more)

### Community 1 - "Home & Project Sections"
Cohesion: 0.08
Nodes (57): GET, GET, EmptyState(), HomePage(), EnableIotButton(), HubOfflineBanner(), HubSettingsButton(), ProgressBar() (+49 more)

### Community 2 - "Database Schema & Migrations"
Cohesion: 0.08
Nodes (34): "ai_insights", "automation_rules", "day_plans", "devices", devices_hub_idx, "expenses", expenses_project_idx, "hubs" (+26 more)

### Community 3 - "Milestone & Metric Components"
Cohesion: 0.07
Nodes (32): IoT Offline State UI, src/app/api/v1/**, groupByPhase(), MilestoneTimeline(), NodeView(), pad(), Section, METRIC_CONFIG (+24 more)

### Community 4 - "Plan-Craft Validation"
Cohesion: 0.11
Nodes (29): BlueprintCheckpoint, BlueprintTag, addDeviceArgs, addDeviceParameters, addRiskArgs, addRiskParameters, addSupplyArgs, addSupplyParameters (+21 more)

### Community 5 - "Schema & Data Layer"
Cohesion: 0.07
Nodes (27): blueprintsRelations, CameraMeta, dayPlansRelations, dayStatus, deviceKind, devicesRelations, deviceStatus, expenseKind (+19 more)

### Community 6 - "Hub Settings Service"
Cohesion: 0.15
Nodes (24): POST, GET, Params, PATCH, CREDENTIAL_MASK, DEFAULT_SETTINGS, emptyHubConfig(), HubCommandDto (+16 more)

### Community 7 - "Core Service Registry"
Cohesion: 0.19
Nodes (19): drizzle-orm, server-only, hhmm(), Db, globalForDb, aiInsights, automationRules, dayPlans (+11 more)

### Community 8 - "Blueprint Generation Route"
Cohesion: 0.16
Nodes (24): POST, blueprintGenerationSchema, phaseRanges(), resolveParams(), architectFor(), planEngines(), AiUnavailableError, writeBlueprintId() (+16 more)

### Community 9 - "Blueprint Ops Engine"
Cohesion: 0.10
Nodes (21): addCheckpointOpSchema, addDeviceOpSchema, addItemOpSchema, addNodeOpSchema, addSupplyOpSchema, applyBlueprintOps(), blueprintOpSchema, deleteCheckpointOpSchema (+13 more)

### Community 10 - "Blueprint Normalizer"
Cohesion: 0.14
Nodes (18): Home Dashboard UI, blueprintParamsSchema, clamp(), CONTINGENCY_RATIO, dayRangeLabel(), EXPERIENCE_LEVELS, mockPlanSchema, normaliseSupplies() (+10 more)

### Community 11 - "Plan-Craft Skill Assets"
Cohesion: 0.13
Nodes (18): ICON_FONT_HREF, ICON_NAMES, BlueprintExperience, PLAN_CRAFT, Skill, SKILLS, buildConstraintsPrompt(), buildConstraintsUserPrompt() (+10 more)

### Community 12 - "Shared Route Harness"
Cohesion: 0.16
Nodes (15): POST, DELETE, body, POST, body, PATCH, Ctx, fail() (+7 more)

### Community 13 - "Root Layout & Toasts"
Cohesion: 0.12
Nodes (16): CLIENT_NAMESPACES, jetbrainsMono, manrope, RootLayout(), spaceGrotesk, viewport, ViewerTimezone(), DURATION_MS (+8 more)

### Community 14 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 15 - "AI Plan Pipeline"
Cohesion: 0.15
Nodes (16): FALLBACK_PARAMS, BlueprintDevice, BlueprintRisk, ArchitectResult, ArchitectTool, applyResult(), craftPlan(), CraftResult (+8 more)

### Community 16 - "Local AI Engine"
Cohesion: 0.16
Nodes (16): ArchitectRequest, ArchitectTurn, gemini(), buildInput(), LOCAL_AI_API_KEY, LOCAL_AI_BASE_URL, LOCAL_AI_MAX_OUTPUT_TOKENS, LOCAL_AI_MODEL (+8 more)

### Community 17 - "Debug Panel UI"
Cohesion: 0.19
Nodes (15): BADGE_TONE, Block(), DebugPanel(), JsonBlock(), JsonTree(), ReactJson, RequestBlock(), Row() (+7 more)

### Community 18 - "Debug Run Service"
Cohesion: 0.18
Nodes (14): dynamic, GET(), dynamic, GET(), currentTurn, debugEnabled(), DebugRun, DebugTurn (+6 more)

### Community 19 - "Demo Seed Script"
Cohesion: 0.21
Nodes (17): postgres, HubConfig, client, db, DEMO_HUB_CONFIG, localDate(), main(), phaseFor() (+9 more)

### Community 20 - "Package Manifest"
Cohesion: 0.12
Nodes (14): name, private, version, drizzle-kit, eslint, react-dom, react-json-view, tailwindcss (+6 more)

### Community 21 - "Expense & Note Routes"
Cohesion: 0.20
Nodes (12): zod, POST, body, POST, body, DELETE, PATCH, addNote() (+4 more)

### Community 22 - "Offline Blueprint Templates"
Cohesion: 0.13
Nodes (14): AQUARIUM, BLUEPRINT_TEMPLATES, BlueprintTemplate, DIORAMA, FALLBACK_TEMPLATE, GARDEN, GENERIC, MARATHON (+6 more)

### Community 23 - "Architect & Gemini Engine"
Cohesion: 0.19
Nodes (12): @google/genai, PLAN_PROVIDERS, BlueprintProvider, Architect, ArchitectCall, AI_TIMEOUT_MS, GEMINI_MODEL, GeminiArchitect (+4 more)

### Community 24 - "Blueprint Draft Store"
Cohesion: 0.20
Nodes (12): DELETE, GET, PATCH, DEFAULT_PARAMS, DEFAULT_PROMPT, blueprintOpsSchema, BlueprintInput, clearBlueprintId() (+4 more)

### Community 25 - "Step Items & Rules Routes"
Cohesion: 0.22
Nodes (10): body, PATCH, body, GET, POST, body, PATCH, parseBody() (+2 more)

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
Nodes (9): buildInput(), InputItem, OPENROUTER_BASE_URL, OPENROUTER_MODEL, OPENROUTER_TIMEOUT_MS, OpenRouterArchitect, parseArguments(), readCalls() (+1 more)

### Community 30 - "IoT Device Concepts"
Cohesion: 0.20
Nodes (10): AI Camera Insight Engine, Actline Smart Dashboard, Actline Offline State, IoT Configuration Modal, IoT Config UI Screenshot, ESP32 Hub v2 (Master Gateway), pH Electrode Probe, SHT31 Air Temp/Humidity Sensor (+2 more)

### Community 31 - "Locale Switching"
Cohesion: 0.33
Nodes (7): Locale, defaultLocale, isLocale(), Locale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, locales

### Community 32 - "Product & Skill Docs"
Cohesion: 0.25
Nodes (8): Actline Application, OpenRouter API Documentation, openrouter:subagent, OpenRouter Server Tools, Actline: Home Requirements, IoT Integration, Plan Blueprint, Skill: plan-craft

### Community 33 - "Architecture & Agent Docs"
Cohesion: 0.29
Nodes (6): doc/architecture.md, doc/requirement.md, Blueprint Normalizer, Architect Interface, Plan-Craft Skill, Database Schema

### Community 34 - "Supply Purchase Routes"
Cohesion: 0.38
Nodes (6): body, GET, POST, addSupply(), dayPlanFor(), getPurchaseLog

### Community 35 - "Supply Update Routes"
Cohesion: 0.43
Nodes (6): body, DELETE, PATCH, ownedSupply(), removeSupply(), updateSupply()

### Community 36 - "Project Creation Route"
Cohesion: 0.33
Nodes (6): createBody, GET, POST, blueprintInputSchema, createProject(), stripStepPrefix()

### Community 37 - "New Studio Screenshots"
Cohesion: 0.50
Nodes (4): Actline - Tạo Dự Án Mới Bằng Ý Tưởng AI, New Project Studio UI Screenshot, Organic Momentum Design System, New Project Studio Page

### Community 38 - "Finance Update Route"
Cohesion: 0.67
Nodes (3): body, PATCH, updateFinance()

### Community 39 - "Incident Reporting"
Cohesion: 0.67
Nodes (3): body, POST, reportIncident()

### Community 40 - "OpenRouter Web Tools"
Cohesion: 0.67
Nodes (3): Fusion Server Tool, Fusion Server Tool, Web Search Server Tool

## Knowledge Gaps
- **48 isolated node(s):** `eslint`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `tsx` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 290 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `server-only` connect `Core Service Registry` to `Home & Project Sections`, `Schema & Data Layer`, `Hub Settings Service`, `Blueprint Generation Route`, `Shared Route Harness`, `AI Plan Pipeline`, `Local AI Engine`, `Debug Run Service`, `Package Manifest`, `Offline Blueprint Templates`, `Architect & Gemini Engine`, `Blueprint Draft Store`, `OpenRouter Engine`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `eslint`, `react-dom`, `tailwindcss` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Foundation` be split into smaller, more focused modules?**
  _Cohesion score 0.05062543090712105 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Shared UI Foundation` to `Home & Project Sections`, `Milestone & Metric Components`, `Schema & Data Layer`, `Core Service Registry`, `Blueprint Generation Route`, `Root Layout & Toasts`, `Debug Panel UI`, `Package Manifest`, `Locale Switching`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Home & Project Sections` be split into smaller, more focused modules?**
  _Cohesion score 0.08354430379746836 - nodes in this community are weakly interconnected._
- **Why does `Icon()` connect `Shared UI Foundation` to `Home & Project Sections`, `Milestone & Metric Components`, `Root Layout & Toasts`, `Debug Panel UI`, `Locale Switching`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Database Schema & Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._