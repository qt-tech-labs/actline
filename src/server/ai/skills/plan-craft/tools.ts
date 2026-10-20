import { z } from "zod";
import { EXPERIENCE_LEVELS } from "@/lib/blueprint";

/**
 * The tools the plan-craft skill exposes to the model.
 *
 * Each tool has two faces that must stay in sync: the JSON Schema the model
 * reads, and the Zod schema the server parses the arguments with.
 */

export type PlanCraftTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/* ------------------------------------------------------------------ *
 * create_node
 * ------------------------------------------------------------------ */

const createNodeParameters = {
  type: "object",
  properties: {
    index: { type: "integer", description: "Thứ tự của giai đoạn, bắt đầu từ 1." },
    title: { type: "string", description: "Tên giai đoạn, 2-8 từ, dạng danh từ (ví dụ: 'Dựng khung')." },
    objective: {
      type: "string",
      description: "Mục tiêu của khoảng ngày này: kết quả đạt được khi kết thúc giai đoạn.",
    },
    startDay: { type: "integer", description: "Ngày bắt đầu, tính từ 1." },
    endDay: { type: "integer", description: "Ngày kết thúc, không nhỏ hơn startDay." },
    successCriteria: { type: "string", description: "Tiêu chí để biết giai đoạn đã hoàn thành." },
    checkpoints: {
      type: "array",
      description: "Các mốc kiểm tra trong giai đoạn (2-5 mốc).",
      items: {
        type: "object",
        properties: {
          day: { type: "integer", description: "Ngày kiểm tra, nằm trong giai đoạn." },
          label: { type: "string", description: "Nhãn ngắn của mốc kiểm tra." },
        },
        required: ["day", "label"],
      },
    },
    items: {
      type: "array",
      description: "Các hành động cụ thể. Mỗi hành động ghim vào một ngày của giai đoạn.",
      items: {
        type: "object",
        properties: {
          day: { type: "integer", description: "Ngày thực hiện, nằm trong [startDay, endDay]." },
          title: { type: "string", description: "Tên hành động, bắt đầu bằng động từ (ví dụ: 'Cắt nhôm khung')." },
          description: { type: "string", description: "Mô tả ngắn một câu." },
          minutes: { type: "integer", description: "Số phút dự kiến; tổng một ngày không vượt quá thời gian rảnh." },
          rationale: { type: "string", description: "Một câu giải thích vì sao hành động này quan trọng." },
          checklist: {
            type: "array",
            description: "Các bước nhỏ để hoàn thành hành động (dành cho người mới bắt đầu).",
            items: { type: "string" },
          },
          requiresPhoto: { type: "boolean", description: "Có cần chụp ảnh làm bằng chứng không." },
          photoTitle: { type: "string", description: "Tiêu đề ô ảnh minh hoạ." },
          photoHint: { type: "string", description: "Gợi ý ngắn về ảnh cần chụp." },
        },
        required: ["day", "title", "minutes"],
      },
    },
  },
  required: ["index", "title", "objective", "startDay", "endDay", "items"],
} as const;

export const createNodeItemArgs = z.object({
  day: z.number().int().min(1).max(365).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(600).default(""),
  minutes: z.number().int().min(1).max(600).default(15),
  rationale: z.string().trim().max(400).nullable().default(null),
  checklist: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  requiresPhoto: z.boolean().default(false),
  photoTitle: z.string().trim().max(200).nullable().default(null),
  photoHint: z.string().trim().max(300).nullable().default(null),
});

export const createNodeShellArgs = z.object({
  index: z.number().int().min(1).max(20),
  title: z.string().trim().min(1).max(120),
  objective: z.string().trim().max(400).default(""),
  startDay: z.number().int().min(1).max(365),
  endDay: z.number().int().min(1).max(365),
  successCriteria: z.string().trim().max(300).nullable().default(null),
  checkpoints: z
    .array(z.object({ day: z.number().int().min(1).max(365), label: z.string().trim().min(1).max(120) }))
    .max(8)
    .default([]),
});

export const createNodeArgs = createNodeShellArgs.extend({
  items: z.array(createNodeItemArgs).max(40).default([]),
});

/* ------------------------------------------------------------------ *
 * add_supply
 * ------------------------------------------------------------------ */

const addSupplyParameters = {
  type: "object",
  properties: {
    name: { type: "string", description: "Tên vật tư (ví dụ: 'Chậu thùng 20L')." },
    spec: { type: "string", description: "Quy cách cụ thể: kích thước, chất liệu, số lượng." },
    priceVnd: { type: "integer", description: "Giá ước tính tính bằng đồng Việt Nam." },
    buyByDay: { type: "integer", description: "Ngày cần mua vật tư này, không muộn hơn ngày bắt đầu dùng." },
  },
  required: ["name", "spec", "priceVnd", "buyByDay"],
} as const;

export const addSupplyArgs = z.object({
  name: z.string().trim().min(1).max(120),
  spec: z.string().trim().max(200).default(""),
  priceVnd: z.number().int().min(0).max(1_000_000_000),
  buyByDay: z.number().int().min(1).max(365),
});

/* ------------------------------------------------------------------ *
 * add_risk
 * ------------------------------------------------------------------ */

const addRiskParameters = {
  type: "object",
  properties: {
    icon: { type: "string", description: "Tên icon Material Symbols, ví dụ 'warning'." },
    title: { type: "string", description: "Tên rủi ro, ngắn gọn." },
    body: { type: "string", description: "Mô tả rủi ro và cách phòng tránh, 1-3 câu." },
    tone: { type: "string", enum: ["warning", "danger"], description: "Mức độ nghiêm trọng." },
  },
  required: ["icon", "title", "body", "tone"],
} as const;

export const addRiskArgs = z.object({
  icon: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(600),
  tone: z.enum(["warning", "danger"]),
});

/* ------------------------------------------------------------------ *
 * add_device
 * ------------------------------------------------------------------ */

const addDeviceParameters = {
  type: "object",
  properties: {
    role: { type: "string", description: "Vai trò ngắn, ví dụ 'GATEWAY', 'CẢM BIẾN ĐẤT'." },
    name: { type: "string", description: "Tên thiết bị." },
    detail: { type: "string", description: "Mô tả ngắn chức năng." },
    icon: { type: "string", description: "Tên icon Material Symbols, ví dụ 'sensors'." },
    protocol: { type: "string", description: "Giao thức hoặc nguồn, ví dụ 'I2C', '12V DC'." },
    kind: {
      type: "string",
      enum: ["gateway", "soil_probe", "valve", "camera"],
      description: "Nhóm thiết bị mà ứng dụng hỗ trợ.",
    },
  },
  required: ["role", "name", "detail", "icon", "protocol", "kind"],
} as const;

export const addDeviceArgs = z.object({
  role: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(300).default(""),
  icon: z.string().trim().min(1).max(60),
  protocol: z.string().trim().max(60).default(""),
  kind: z.enum(["gateway", "soil_probe", "valve", "camera"]),
});

/* ------------------------------------------------------------------ *
 * finalize_plan
 * ------------------------------------------------------------------ */

const finalizePlanParameters = {
  type: "object",
  properties: {
    name: { type: "string", description: "Tên dự án, 3-10 từ, dạng danh từ." },
    summary: { type: "string", description: "Tóm tắt kế hoạch trong 1-2 câu, bằng tiếng Việt." },
    icon: { type: "string", description: "Tên icon Material Symbols đại diện cho dự án, ví dụ 'psychiatry'." },
    tags: {
      type: "array",
      description: "2-4 nhãn ngắn mô tả dự án.",
      items: {
        type: "object",
        properties: {
          icon: { type: "string", description: "Tên icon Material Symbols." },
          label: { type: "string", description: "Nhãn ngắn, 1-3 từ." },
          tone: { type: "string", enum: ["primary", "secondary", "tertiary"] },
        },
        required: ["icon", "label", "tone"],
      },
    },
    iotSuggested: {
      type: "boolean",
      description: "Chỉ true khi dự án thực sự cần theo dõi cảm biến (vườn, nhà kính, bể cá, hoặc người dùng nhắc tới cảm biến/tưới/ camera).",
    },
    goldenStart: { type: "string", description: "Giờ vàng của ngày 1, định dạng HH:MM." },
    goldenEnd: { type: "string", description: "Giờ kết thúc của khung giờ vàng ngày 1, định dạng HH:MM." },
  },
  required: ["name", "summary", "icon", "tags", "iotSuggested"],
} as const;

export const finalizePlanArgs = z.object({
  name: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(600),
  icon: z.string().trim().min(1).max(60),
  tags: z
    .array(
      z.object({
        icon: z.string().trim().min(1).max(60),
        label: z.string().trim().min(1).max(60),
        tone: z.enum(["primary", "secondary", "tertiary"]),
      }),
    )
    .max(6)
    .default([]),
  iotSuggested: z.boolean().default(false),
  goldenStart: z.string().trim().max(5).nullable().default(null),
  goldenEnd: z.string().trim().max(5).nullable().default(null),
});

/* ------------------------------------------------------------------ *
 * propose_constraints
 *
 * The knobs are topic-dependent: a three-month renovation is not a
 * 30-day job. The model proposes the values the idea implies; whatever
 * the user set by hand always wins.
 * ------------------------------------------------------------------ */

const proposeConstraintsParameters = {
  type: "object",
  properties: {
    totalDays: { type: "integer", description: "Số ngày hợp lý cho dự án này (7-365)." },
    dailyMinutes: { type: "integer", description: "Số phút mỗi ngày người dùng dành cho dự án (10-600)." },
    budgetVnd: { type: "integer", description: "Ngân sách hợp lý cho dự án, tính bằng đồng Việt Nam." },
    experience: {
      type: "string",
      enum: ["beginner", "basic", "pro"],
      description: "Trình độ người dùng hợp lý với dự án này.",
    },
    rationale: { type: "string", description: "Một câu giải thích vì sao chọn các thông số này." },
  },
  required: ["totalDays", "dailyMinutes", "budgetVnd", "experience", "rationale"],
} as const;

export const proposeConstraintsArgs = z.object({
  totalDays: z.number().int().min(7).max(365),
  dailyMinutes: z.number().int().min(10).max(600),
  budgetVnd: z.number().int().min(0).max(1_000_000_000),
  experience: z.enum(EXPERIENCE_LEVELS),
  rationale: z.string().trim().max(400).default(""),
});

/* ------------------------------------------------------------------ *
 * The tool set
 * ------------------------------------------------------------------ */

export const PLAN_CRAFT_TOOLS: PlanCraftTool[] = [
  {
    type: "function",
    name: "create_node",
    description:
      "Tạo một giai đoạn của kế hoạch: một khoảng ngày liên tục với một mục tiêu, kèm các hành động cụ thể ghim theo ngày.",
    parameters: createNodeParameters as unknown as Record<string, unknown>,
  },
  {
    type: "function",
    name: "add_supply",
    description: "Thêm một mục vật tư vào danh mục BOM kèm giá ước tính và ngày phải mua.",
    parameters: addSupplyParameters as unknown as Record<string, unknown>,
  },
  {
    type: "function",
    name: "add_risk",
    description: "Thêm một rủi ro của dự án kèm cách phòng tránh.",
    parameters: addRiskParameters as unknown as Record<string, unknown>,
  },
  {
    type: "function",
    name: "add_device",
    description: "Thêm một thiết bị IoT được dự đoán cho dự án (chỉ khi dự án cần cảm biến).",
    parameters: addDeviceParameters as unknown as Record<string, unknown>,
  },
  {
    type: "function",
    name: "finalize_plan",
    description:
      "Chốt danh tính của kế hoạch: tên dự án, tóm tắt, nhãn, icon và gợi ý IoT. Gọi tool này sau khi đã tạo xong các giai đoạn.",
    parameters: finalizePlanParameters as unknown as Record<string, unknown>,
  },
];

/** The single tool that proposes the planning constraints. */
export const PROPOSE_CONSTRAINTS_TOOL: PlanCraftTool = {
  type: "function",
  name: "propose_constraints",
  description:
    "Đề xuất bốn thông số của kế hoạch: số ngày, số phút mỗi ngày, ngân sách và trình độ người dùng — phù hợp với bản chất của dự án.",
  parameters: proposeConstraintsParameters as unknown as Record<string, unknown>,
};

/** The parsed arguments of a tool call, per tool name. */
export const PLAN_CRAFT_ARG_SCHEMAS = {
  create_node: createNodeArgs,
  add_supply: addSupplyArgs,
  add_risk: addRiskArgs,
  add_device: addDeviceArgs,
  finalize_plan: finalizePlanArgs,
} as const;

export type PlanCraftToolName = keyof typeof PLAN_CRAFT_ARG_SCHEMAS;
