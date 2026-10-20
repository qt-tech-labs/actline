import {
  buildConstraintsPrompt,
  buildConstraintsUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  type PlanCraftConstraints,
  type PlanCraftEnvelope,
} from "./plan-craft/system-prompt";
import {
  PLAN_CRAFT_TOOLS,
  PROPOSE_CONSTRAINTS_TOOL,
  type PlanCraftTool,
  type PlanCraftToolName,
} from "./plan-craft/tools";
import { validateToolCall, type PlanCraftContext, type ToolOutcome } from "./plan-craft/validate";

/**
 * A skill is a reusable way of working with the model: the tools it may call,
 * the instruction it follows and the rules the server enforces.
 */
export type Skill = {
  key: string;
  /** The tools the model may call to build the plan. */
  tools: PlanCraftTool[];
  /** The tool that proposes the planning constraints. */
  constraintsTool: PlanCraftTool;
  /** The system instruction for the plan, built from the resolved constraints. */
  systemPrompt: (constraints: PlanCraftConstraints) => string;
  /** The user turn for the plan. */
  userPrompt: (prompt: string, constraints: PlanCraftConstraints) => string;
  /** The system instruction for the constraints question. */
  constraintsPrompt: (envelope: PlanCraftEnvelope) => string;
  /** The user turn for the constraints question. */
  constraintsUserPrompt: (envelope: PlanCraftEnvelope) => string;
  /** Checks one tool call and repairs what can be repaired. */
  validate: (name: PlanCraftToolName, args: unknown, context: PlanCraftContext) => ToolOutcome;
};

/** The plan-craft skill: an idea becomes a plan of nodes and action items. */
export const PLAN_CRAFT: Skill = {
  key: "plan-craft",
  tools: PLAN_CRAFT_TOOLS,
  constraintsTool: PROPOSE_CONSTRAINTS_TOOL,
  systemPrompt: buildSystemPrompt,
  userPrompt: buildUserPrompt,
  constraintsPrompt: buildConstraintsPrompt,
  constraintsUserPrompt: buildConstraintsUserPrompt,
  validate: validateToolCall,
};

export const SKILLS: Record<string, Skill> = {
  [PLAN_CRAFT.key]: PLAN_CRAFT,
};

export type { PlanCraftConstraints, PlanCraftContext, PlanCraftEnvelope, PlanCraftToolName, ToolOutcome };
