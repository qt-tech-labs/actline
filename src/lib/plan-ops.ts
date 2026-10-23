import { z } from "zod";
import { normalizeBlueprint } from "@/lib/blueprint";
import type { Blueprint, BlueprintDevice, BlueprintItem, BlueprintNode, BlueprintSupply } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Hand edits on a plan.
 *
 * The AI crafts the plan once; everything after that is the user's call.
 * Every edit is an operation, applied to the stored draft and normalised
 * again, so the plan keeps its invariants no matter how it is edited.
 * ------------------------------------------------------------------ */

const itemFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(600).default(""),
  minutes: z.number().int().min(5).max(600).default(15),
  rationale: z.string().trim().max(400).nullable().default(null),
  checklist: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  requiresPhoto: z.boolean().default(false),
  photoTitle: z.string().trim().max(200).nullable().default(null),
  photoHint: z.string().trim().max(300).nullable().default(null),
};

export const addNodeOpSchema = z.object({
  op: z.literal("addNode"),
  title: z.string().trim().min(1).max(120),
  objective: z.string().trim().max(400).default(""),
  startDay: z.number().int().min(1).max(365),
  endDay: z.number().int().min(1).max(365),
});

export const updateNodeOpSchema = z.object({
  op: z.literal("updateNode"),
  index: z.number().int().min(1),
  title: z.string().trim().min(1).max(120).optional(),
  objective: z.string().trim().max(400).optional(),
  startDay: z.number().int().min(1).max(365).optional(),
  endDay: z.number().int().min(1).max(365).optional(),
  successCriteria: z.string().trim().max(300).nullable().optional(),
});

export const deleteNodeOpSchema = z.object({
  op: z.literal("deleteNode"),
  index: z.number().int().min(1),
});

export const addItemOpSchema = z.object({
  op: z.literal("addItem"),
  nodeIndex: z.number().int().min(1),
  day: z.number().int().min(1).max(365).optional(),
  ...itemFields,
});

export const updateItemOpSchema = z.object({
  op: z.literal("updateItem"),
  nodeIndex: z.number().int().min(1),
  itemId: z.string().min(1),
  title: itemFields.title.optional(),
  description: itemFields.description.optional(),
  minutes: itemFields.minutes.optional(),
  rationale: itemFields.rationale.optional(),
  checklist: itemFields.checklist.optional(),
  requiresPhoto: itemFields.requiresPhoto.optional(),
  photoTitle: itemFields.photoTitle.optional(),
  photoHint: itemFields.photoHint.optional(),
  day: z.number().int().min(1).max(365).optional(),
});

export const deleteItemOpSchema = z.object({
  op: z.literal("deleteItem"),
  nodeIndex: z.number().int().min(1),
  itemId: z.string().min(1),
});

export const addSupplyOpSchema = z.object({
  op: z.literal("addSupply"),
  name: z.string().trim().min(1).max(120),
  spec: z.string().trim().max(200).default(""),
  priceVnd: z.number().int().min(0).max(1_000_000_000).default(0),
  buyByDay: z.number().int().min(1).max(365),
});

export const updateSupplyOpSchema = z.object({
  op: z.literal("updateSupply"),
  name: z.string().trim().min(1).max(120),
  spec: z.string().trim().max(200).optional(),
  priceVnd: z.number().int().min(0).max(1_000_000_000).optional(),
  buyByDay: z.number().int().min(1).max(365).optional(),
});

export const deleteSupplyOpSchema = z.object({
  op: z.literal("deleteSupply"),
  name: z.string().trim().min(1).max(120),
});

export const addCheckpointOpSchema = z.object({
  op: z.literal("addCheckpoint"),
  nodeIndex: z.number().int().min(1),
  day: z.number().int().min(1).max(365),
  label: z.string().trim().min(1).max(120),
});

export const deleteCheckpointOpSchema = z.object({
  op: z.literal("deleteCheckpoint"),
  nodeIndex: z.number().int().min(1),
  day: z.number().int().min(1).max(365),
  label: z.string().trim().min(1).max(120),
});

const deviceFields = {
  role: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(200).default(""),
  protocol: z.string().trim().max(40).default(""),
  kind: z.enum(["gateway", "soil_probe", "valve", "camera"]),
};

export const addDeviceOpSchema = z.object({ op: z.literal("addDevice"), ...deviceFields });

export const updateDeviceOpSchema = z.object({
  op: z.literal("updateDevice"),
  index: z.number().int().min(1),
  role: deviceFields.role.optional(),
  name: deviceFields.name.optional(),
  detail: deviceFields.detail.optional(),
  protocol: deviceFields.protocol.optional(),
  kind: deviceFields.kind.optional(),
});

export const deleteDeviceOpSchema = z.object({ op: z.literal("deleteDevice"), index: z.number().int().min(1) });

export const blueprintOpSchema = z.discriminatedUnion("op", [
  addNodeOpSchema,
  updateNodeOpSchema,
  deleteNodeOpSchema,
  addItemOpSchema,
  updateItemOpSchema,
  deleteItemOpSchema,
  addSupplyOpSchema,
  updateSupplyOpSchema,
  deleteSupplyOpSchema,
  addCheckpointOpSchema,
  deleteCheckpointOpSchema,
  addDeviceOpSchema,
  updateDeviceOpSchema,
  deleteDeviceOpSchema,
]);

export const blueprintOpsSchema = z.object({
  ops: z.array(blueprintOpSchema).min(1).max(50),
});

export type BlueprintOp = z.infer<typeof blueprintOpSchema>;

/** Icons for each device family; every name is in the app's icon subset. */
export const DEVICE_ICONS: Record<BlueprintDevice["kind"], string> = {
  gateway: "router",
  soil_probe: "sensors",
  valve: "valve",
  camera: "videocam",
};

const newId = () => `it_${crypto.randomUUID()}`;

function withNode(plan: Blueprint, index: number, update: (node: BlueprintNode) => BlueprintNode): Blueprint {
  return { ...plan, nodes: plan.nodes.map((node, position) => (position + 1 === index ? update(node) : node)) };
}

/** Applies a batch of edits to a plan and normalises the result. */
export function applyBlueprintOps(plan: Blueprint, ops: BlueprintOp[]): Blueprint {
  let next: Blueprint = { ...plan };

  for (const op of ops) {
    switch (op.op) {
      case "addNode": {
        const node: BlueprintNode = {
          index: next.nodes.length + 1,
          title: op.title,
          objective: op.objective,
          startDay: op.startDay,
          endDay: op.endDay,
          rangeLabel: "",
          items: [],
          checkpoints: [],
          successCriteria: null,
          tone: "primary",
        };
        next = { ...next, nodes: [...next.nodes, node] };
        break;
      }
      case "updateNode": {
        next = withNode(next, op.index, (node) => ({
          ...node,
          ...(op.title !== undefined ? { title: op.title } : {}),
          ...(op.objective !== undefined ? { objective: op.objective } : {}),
          ...(op.startDay !== undefined ? { startDay: op.startDay } : {}),
          ...(op.endDay !== undefined ? { endDay: op.endDay } : {}),
          ...(op.successCriteria !== undefined ? { successCriteria: op.successCriteria } : {}),
        }));
        break;
      }
      case "deleteNode": {
        next = { ...next, nodes: next.nodes.filter((_, position) => position + 1 !== op.index) };
        break;
      }
      case "addItem": {
        const item: BlueprintItem = {
          id: newId(),
          day: op.day ?? 0,
          title: op.title,
          description: op.description,
          minutes: op.minutes,
          rationale: op.rationale,
          checklist: op.checklist,
          requiresPhoto: op.requiresPhoto,
          photoTitle: op.photoTitle,
          photoHint: op.photoHint,
        };
        next = withNode(next, op.nodeIndex, (node) => ({ ...node, items: [...node.items, item] }));
        break;
      }
      case "updateItem": {
        next = withNode(next, op.nodeIndex, (node) => ({
          ...node,
          items: node.items.map((item) =>
            item.id === op.itemId
              ? {
                  ...item,
                  ...(op.title !== undefined ? { title: op.title } : {}),
                  ...(op.description !== undefined ? { description: op.description } : {}),
                  ...(op.minutes !== undefined ? { minutes: op.minutes } : {}),
                  ...(op.rationale !== undefined ? { rationale: op.rationale } : {}),
                  ...(op.checklist !== undefined ? { checklist: op.checklist } : {}),
                  ...(op.requiresPhoto !== undefined ? { requiresPhoto: op.requiresPhoto } : {}),
                  ...(op.photoTitle !== undefined ? { photoTitle: op.photoTitle } : {}),
                  ...(op.photoHint !== undefined ? { photoHint: op.photoHint } : {}),
                  ...(op.day !== undefined ? { day: op.day } : {}),
                }
              : item,
          ),
        }));
        break;
      }
      case "deleteItem": {
        next = withNode(next, op.nodeIndex, (node) => ({
          ...node,
          items: node.items.filter((item) => item.id !== op.itemId),
        }));
        break;
      }
      case "addSupply": {
        const supply: BlueprintSupply = {
          name: op.name,
          spec: op.spec,
          priceVnd: op.priceVnd,
          buyByDay: op.buyByDay,
          urgency: "later",
          priceSource: "user",
        };
        next = { ...next, supplies: [...next.supplies.filter((item) => item.name !== op.name), supply] };
        break;
      }
      case "updateSupply": {
        next = {
          ...next,
          supplies: next.supplies.map((item) =>
            item.name === op.name
              ? {
                  ...item,
                  ...(op.spec !== undefined ? { spec: op.spec } : {}),
                  // A price the user typed is their price: it is never scaled down.
                  ...(op.priceVnd !== undefined ? { priceVnd: op.priceVnd, priceSource: "user" as const } : {}),
                  ...(op.buyByDay !== undefined ? { buyByDay: op.buyByDay } : {}),
                }
              : item,
          ),
        };
        break;
      }
      case "deleteSupply": {
        next = { ...next, supplies: next.supplies.filter((item) => item.name !== op.name) };
        break;
      }
      case "addCheckpoint": {
        next = withNode(next, op.nodeIndex, (node) => ({
          ...node,
          checkpoints: [...node.checkpoints, { day: op.day, label: op.label }],
        }));
        break;
      }
      case "addDevice": {
        const device: BlueprintDevice = {
          role: op.role,
          name: op.name,
          detail: op.detail,
          protocol: op.protocol,
          kind: op.kind,
          icon: DEVICE_ICONS[op.kind],
          tone: op.kind === "gateway" ? "primary" : "secondary",
        };
        next = { ...next, devices: [...next.devices, device] };
        break;
      }
      case "updateDevice": {
        next = {
          ...next,
          devices: next.devices.map((device, position) =>
            position + 1 === op.index
              ? {
                  ...device,
                  ...(op.role !== undefined ? { role: op.role } : {}),
                  ...(op.name !== undefined ? { name: op.name } : {}),
                  ...(op.detail !== undefined ? { detail: op.detail } : {}),
                  ...(op.protocol !== undefined ? { protocol: op.protocol } : {}),
                  ...(op.kind !== undefined ? { kind: op.kind } : {}),
                }
              : device,
          ),
        };
        break;
      }
      case "deleteDevice": {
        next = { ...next, devices: next.devices.filter((_, position) => position + 1 !== op.index) };
        break;
      }
      case "deleteCheckpoint": {
        next = withNode(next, op.nodeIndex, (node) => ({
          ...node,
          checkpoints: node.checkpoints.filter((checkpoint) => checkpoint.day !== op.day || checkpoint.label !== op.label),
        }));
        break;
      }
    }
  }

  return normalizeBlueprint(next);
}
