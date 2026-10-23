import {
  buildRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  type PlanCraftEnvelope,
} from "./plan-craft/system-prompt";
import { validatePlanDocument, type PlanCraftReport } from "./plan-craft/validate";

/**
 * A skill is a reusable way of working with the model: the shape of the
 * document it answers with, the instruction it follows and the rules the
 * server enforces.
 */
export type Skill = {
  key: string;
  /** The system instruction for the plan, built from the envelope. */
  systemPrompt: (envelope: PlanCraftEnvelope) => string;
  /** The user turn for the plan. */
  userPrompt: (envelope: PlanCraftEnvelope) => string;
  /** The user turn that corrects an unusable answer. */
  repairPrompt: (problems: string[]) => string;
  /** Validates one document and repairs what can be repaired. */
  validate: (doc: unknown, envelope: PlanCraftEnvelope) => PlanCraftReport;
};

/** The plan-craft skill: an idea becomes a plan of nodes and action items. */
export const PLAN_CRAFT: Skill = {
  key: "plan-craft",
  systemPrompt: buildSystemPrompt,
  userPrompt: buildUserPrompt,
  repairPrompt: buildRepairPrompt,
  validate: validatePlanDocument,
};

export const SKILLS: Record<string, Skill> = {
  [PLAN_CRAFT.key]: PLAN_CRAFT,
};

export type { PlanCraftEnvelope, PlanCraftReport };
