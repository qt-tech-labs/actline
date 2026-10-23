# Skill: plan-craft

Turns a free-text project idea into an **actionable plan** the app can execute day by day.

The plan is a tree, and the model builds it in **one answer** as a single JSON document:

```
Blueprint
└── nodes[]        6–10 · a group of work with a time range and an objective
    └── items[]    one concrete action item, pinned to a day
```

A **node** is a range of days with one objective ("build the frame, days 10–18"). An **item** is a
single action the user performs on one day ("measure the frame, day 10, 20 min"). A day may
legitimately have no item — the app then shows the node's objective and offers an "add" button.

> The executable version of these rules lives next to this file in `system-prompt.ts` (the system
> instruction) and `validate.ts` (the server-side checks). **Keep the three in sync.**

## Why a skill

The idea can be about anything — balcony gardening, a telepresence robot, sourdough, a 3-month
renovation. The *shape* of the answer must not change with the topic, so the rules live in one
place and the server enforces them. The model proposes; the server disposes.

## The rules

| | Rule | Enforced by |
|---|---|---|
| R1 | 6–10 nodes. Their day ranges tile `1..totalDays` contiguously — no gap, no overlap. The first node starts on day 1, the last one ends on the last day. | normaliser (repairs the tiling) |
| R2 | **Never invent filler work.** A day without an item is correct when the objective is waiting, curing, fermenting or observing. Prefer an empty day over a made-up task. | skill instruction |
| R3 | Every item is pinned to a day inside its node's range. The minutes of one day never exceed the user's daily time. `beginner` → checklist + rationale on every item; `pro` → terse items, no checklist. | validator + normaliser |
| R4 | The bill of materials is in VND, at realistic Vietnamese prices, and its total stays inside the budget. `buyByDay` is the day the item has to be bought, not the day it is used. | validator + normaliser |
| R5 | Icons come from the app's icon set (the icon font is a subset — an unknown name renders nothing). | validator (swaps unknown icons) |
| R6 | Every user-facing string is **Vietnamese**. Numbers are plain digits; prices are integers in VND. | skill instruction |
| R7 | IoT is a *suggestion*, only for sensor-driven projects (a garden, a greenhouse, an aquarium, or when the user mentions sensors, irrigation or cameras). Never for a robot build, a renovation or a training plan. | skill instruction |
| R8 | 3–5 risks, each a real failure mode with a mitigation. 2–5 checkpoints per node. | validator |
| R9 | The golden time window (`goldenStart`/`goldenEnd`) describes the best time of **day 1** only. | validator |

## The document

The model answers with exactly one JSON document, no prose:

```json
{
  "constraints": { "totalDays": 45, "dailyMinutes": 90, "budgetVnd": 500000, "experience": "beginner" },
  "plan": {
    "name": "…", "summary": "…", "icon": "…", "tags": [{ "icon": "…", "label": "…", "tone": "primary" }],
    "iotSuggested": false, "goldenStart": "06:30", "goldenEnd": "06:45",
    "nodes":  [{ "index": 1, "title": "…", "objective": "…", "startDay": 1, "endDay": 5,
                  "checkpoints": [{ "day": 3, "label": "…" }],
                  "items": [{ "day": 1, "title": "…", "minutes": 20, "checklist": ["…"] }] }],
    "supplies": [{ "name": "…", "spec": "…", "priceVnd": 40000, "buyByDay": 1 }],
    "risks":    [{ "icon": "…", "title": "…", "body": "…", "tone": "warning" }],
    "devices":  [{ "role": "GATEWAY", "name": "…", "icon": "…", "protocol": "…", "kind": "gateway" }]
  }
}
```

The server parses the document, repairs what it can (day ranges, minutes, icons, prices), and only
asks the model again — once, with the full problem list — when a piece genuinely cannot be used. A
truncated or prose-wrapped answer is likewise fed back, not thrown away.

## The envelope

The user's idea never reaches the model alone. It always arrives with the constraints the knobs
imply: how many days, how many minutes a day, how much money, and how experienced the user is.
A 45-day plan with 20 minutes a day is a different plan from a 45-day plan with 90 minutes a day —
the model has to see the envelope, not infer it.
