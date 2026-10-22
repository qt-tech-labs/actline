/**
 * Seeds a demo user and the "Vườn dưa leo Nhật" project that mirrors design/home.
 * Re-runnable: deletes the demo user (cascading) before inserting again.
 * Dates are relative to now so the demo project is always on day 16 of 45.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { HubConfig } from "../../lib/hub-config";
import * as s from "./schema";

const TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 86_400_000;
const CURRENT_DAY = 16;

const url = process.env.DATABASE_URL ?? "postgres://actline:actline@localhost:5432/actline";
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema: s });

const DEMO_HUB_CONFIG: HubConfig = {
  chip: "ESP32-S3",
  firmwareVersion: "v2.4.12-secure",
  flash: "16MB Quad-SPI",
  bleReady: true,
  bootedAt: new Date(Date.now() - (14 * 24 + 6) * 3_600_000 - 22 * 60_000).toISOString(),
  wifi: { ssid: "Ban công T4_IoT_5G", rssiDbm: -58, ip: "192.168.1.185", mac: "84:F7:03:8F:4C:20" },
  mqtt: { host: "mqtt.actline.io", port: 8883, clientId: "actline-hub-8F4C20", auth: "mtls" },
  pins: [
    {
      id: "air", port: "A04", channel: "GPIO 32", type: "i2c", name: "Cảm biến Nhiệt độ & Độ ẩm không khí (SHT31 / DHT22)",
      description: "Dây cắm: SDA (GPIO 21) - SCL (GPIO 22) • Tần số đọc: 10s/lần • Calib: ±0.2°C",
      metrics: ["air_temperature", "air_humidity"], action: null,
    },
    {
      id: "soil", port: "A01", channel: "ADC 1", type: "analog", name: "Cảm biến Độ ẩm đất rễ (Analog điện dung Capacitive v2)",
      description: "Chân tín hiệu analog đọc điện áp 0-3.3V • Ngưỡng báo tưới: < 35% ẩm",
      metrics: ["soil_moisture"], action: "calibrate_soil",
    },
    {
      id: "ph", port: "A02", channel: "ADC 2", type: "analog", name: "Đầu dò pH giá thể (Analog pH Electrode 0-14)",
      description: "Module khuếch đại tín hiệu pH-4502C • Hiệu chuẩn: dung dịch chuẩn pH 4.01/6.86",
      metrics: ["substrate_ph"], action: "calibrate_ph",
    },
    {
      id: "valve", port: "D18", channel: "Relay 1", type: "digital_out", name: "Van điện từ tưới nhỏ giọt Solenoid 12V (Actuator)",
      description: "Chân kích đóng Relay Optocoupler • Trạng thái: Tự động ngắt khi đạt ẩm hoặc sau 5p",
      metrics: [], action: "test_valve",
    },
  ],
  cameraUrl: "rtsp://admin:demo-password@192.168.1.190:554/live",
  telemetryIntervalSec: 15,
  lightSleepLowBattery: true,
  valveWatchdog: true,
};

const email = process.env.DEMO_USER_EMAIL ?? "demo@actline.app";

function localDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(Date.now() + offsetDays * DAY_MS));
}

/** Today at HH:mm in the project timezone (Vietnam has no DST, fixed +07:00). */
function todayAt(hhmm: string): Date {
  return new Date(`${localDate()}T${hhmm}:00+07:00`);
}

function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

/** Deterministic wavy series of `n` points ending exactly at `last`. */
function series(n: number, base: number, amp: number, last: number, seed: number): number[] {
  const rand = rng(seed);
  const out = Array.from({ length: n }, (_, i) => base + Math.sin(i / 2.3 + seed) * amp + (rand() - 0.5) * amp * 0.8);
  out[n - 1] = last;
  return out;
}


/* ------------------------------------------------------------------ *
 * Plan shapes
 *
 * The seeded projects have the same shape the plan studio produces: stages,
 * a milestone per stage, a day plan for every project day and an action to
 * do on that day. A day with a plan but nothing to do is a dead end in the
 * project view, so every day gets its phase's routine.
 * ------------------------------------------------------------------ */

type SeedPhase = {
  /** Short title of the phase: the title of the day plan. */
  title: string;
  /** What this range of days achieves: the summary of the day plan. */
  objective: string;
  startDay: number;
  endDay: number;
  /** The action of a day in this phase. */
  routine: string;
  minutes?: number;
  checklist?: string[];
};

type SeedStep = {
  title: string;
  description?: string;
  minutes?: number;
  status?: "done" | "doing" | "todo";
  completedAt?: Date;
  clipSeconds?: number;
  hasCameraShortcut?: boolean;
  requiresPhoto?: boolean;
  items?: { label: string; done?: boolean }[];
  photo?: { filename: string; url: string };
};

const phaseFor = (phases: SeedPhase[], day: number): SeedPhase =>
  phases.find((phase) => day >= phase.startDay && day <= phase.endDay) ?? phases[phases.length - 1]!;

/** The stages of a project, the way the studio writes them. */
async function seedStages(projectId: string, phases: SeedPhase[]) {
  await db.insert(s.projectStages).values(
    phases.map((phase, index) => ({
      projectId,
      name: `Giai đoạn ${index + 1}: ${phase.title}`,
      startDay: phase.startDay,
      endDay: phase.endDay,
    })),
  );
}

/** A milestone at the start of every phase, plus the day the plan ends. */
async function seedPhaseMilestones(projectId: string, phases: SeedPhase[], totalDays: number) {
  await db.insert(s.milestones).values([
    ...phases.map((phase, index) => ({
      projectId,
      day: phase.startDay,
      label: phase.title,
      title: `N${String(phase.startDay).padStart(2, "0")}: ${phase.title}`,
      icon: index === 0 ? "check" : "event_upcoming",
    })),
    {
      projectId,
      day: totalDays,
      label: "Hoàn thành",
      title: `N${String(totalDays).padStart(2, "0")}: Hoàn thành kế hoạch ${totalDays} ngày`,
      icon: "flag",
      kind: "target" as const,
    },
  ]);
}

/**
 * A day plan for every project day. Days listed in `overrides` keep their own
 * title, summary and steps; the other days get their phase's routine.
 */
async function seedDayPlans(
  projectId: string,
  totalDays: number,
  phases: SeedPhase[],
  overrides: Record<number, { title: string; summary: string; steps: SeedStep[]; goldenStart?: string; goldenEnd?: string }> = {},
) {
  const plans = await db
    .insert(s.dayPlans)
    .values(
      Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        const phase = phaseFor(phases, day);
        const override = overrides[day];
        return {
          projectId,
          day,
          title: override?.title ?? phase.title,
          summary: override?.summary ?? phase.objective,
          goldenStart: override?.goldenStart ?? null,
          goldenEnd: override?.goldenEnd ?? null,
        };
      }),
    )
    .returning();

  const values: (typeof s.steps.$inferInsert)[] = [];
  for (const plan of plans) {
    const phase = phaseFor(phases, plan.day);
    const override = overrides[plan.day];
    if (override) {
      override.steps.forEach((step, index) => {
        values.push({
          dayPlanId: plan.id,
          position: index + 1,
          title: step.title,
          description: step.description,
          estimatedMinutes: step.minutes,
          status: step.status ?? "todo",
          completedAt: step.completedAt,
          clipSeconds: step.clipSeconds,
          hasCameraShortcut: step.hasCameraShortcut,
          requiresPhoto: step.requiresPhoto,
        });
      });
      continue;
    }
    values.push({
      dayPlanId: plan.id,
      position: 1,
      title: phase.routine,
      estimatedMinutes: phase.minutes ?? 15,
    });
  }
  const inserted = await db.insert(s.steps).values(values).returning();

  // The checklist of every step that has one.
  const checklist: (typeof s.stepItems.$inferInsert)[] = [];
  for (const plan of plans) {
    const override = overrides[plan.day];
    if (!override) continue;
    for (const [index, step] of override.steps.entries()) {
      const row = inserted.find((candidate) => candidate.dayPlanId === plan.id && candidate.position === index + 1);
      if (!row || !step.items) continue;
      step.items.forEach((item, itemIndex) => {
        checklist.push({ stepId: row.id, position: itemIndex + 1, label: item.label, done: item.done ?? false });
      });
    }
  }
  if (checklist.length > 0) await db.insert(s.stepItems).values(checklist);

  // The photo proof of the steps that ask for one.
  const photos: (typeof s.stepPhotos.$inferInsert)[] = [];
  for (const plan of plans) {
    const override = overrides[plan.day];
    if (!override) continue;
    for (const [index, step] of override.steps.entries()) {
      if (!step.photo) continue;
      const row = inserted.find((candidate) => candidate.dayPlanId === plan.id && candidate.position === index + 1);
      if (row) photos.push({ stepId: row.id, filename: step.photo.filename, url: step.photo.url });
    }
  }
  if (photos.length > 0) await db.insert(s.stepPhotos).values(photos);

  return new Map(plans.map((plan) => [plan.day, plan]));
}

async function main() {
  await db.delete(s.users).where(eq(s.users.email, email));

  const [user] = await db
    .insert(s.users)
    .values({
      email,
      name: "Kỹ sư Actline",
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDzvkz2YHiYXjUiRpM3OgzQlOnFxpjJOqUiMyLTRvWKaetgU4JN87S7o1lPeaCCnPXEX0DjQbpJy2-9D-HfurturX3OpbJIpsE7T7CZUPLmUlD5KchTHZXCm25HaJ7dLfglJ8thqALhn6pyLq6ALJZTdyp3XQbyNKP9CLFIBU0v1fTLuM3ArQLS_0qFbnxmZyFXHG4OpqVBLe5yWI_Y67gldOQaCtagcq9vlM2KeUuipMqY4iogyg",
    })
    .returning();
  if (!user) throw new Error("user insert failed");

  const [main] = await db
    .insert(s.projects)
    .values({
      userId: user.id,
      name: "Vườn dưa leo ban công Nhật",
      icon: "psychiatry",
      startDate: localDate(-(CURRENT_DAY - 1)),
      totalDays: 45,
      iotEnabled: true,
      budgetVnd: 1_200_000,
      expectedRevenueVnd: 2_400_000,
    })
    .returning();
  if (!main) throw new Error("project insert failed");

  // The other projects are real plans too: stages, milestones and a day to work on.
  const sideProjects: { name: string; icon: string; startOffset: number; totalDays: number; phases: SeedPhase[] }[] = [
    {
      name: "Robot telepresence v2",
      icon: "precision_manufacturing",
      startOffset: 27,
      totalDays: 60,
      phases: [
        {
          title: "Thu thập linh kiện & thiết kế",
          objective: "Đủ linh kiện và bản vẽ cơ cấu để bắt đầu dựng.",
          startDay: 1,
          endDay: 18,
          routine: "Đối chiếu linh kiện với danh sách & đo khung chính",
          minutes: 20,
          checklist: ["Kiểm tra linh kiện theo danh sách", "Đo và ghi kích thước khung"],
        },
        {
          title: "Dựng khung & cơ khí",
          objective: "Khung robot chắc và các khớp xoay đúng hành trình.",
          startDay: 19,
          endDay: 36,
          routine: "Kiểm tra khớp xoay & siết bulong theo danh sách",
          minutes: 30,
          checklist: ["Làm nội thất khung", "Siết bulong theo bảng mô-men"],
        },
        {
          title: "Lắp ráp, lập trình & test",
          objective: "Robot chạy được và truyền hình ổn định.",
          startDay: 37,
          endDay: 60,
          routine: "Test truyền hình & đo độ trễ",
          minutes: 20,
          checklist: ["Chạy bộ test tự động", "Ghi lại độ trễ và ảnh chụp"],
        },
      ],
    },
    {
      name: "Mô hình sa bàn Cyberpunk 1:35",
      icon: "architecture",
      startOffset: 4,
      totalDays: 40,
      phases: [
        {
          title: "Dàn khung & nền",
          objective: "Khung 30x30cm chắc chắn và nền hoàn chỉnh.",
          startDay: 1,
          endDay: 12,
          routine: "Cắt dán khung & hoàn thiện nền",
          minutes: 30,
          checklist: ["Cắt dán khung gỗ", "Sơn nền theo bảng màu"],
        },
        {
          title: "Phối cảnh kiến trúc",
          objective: "Các tòa nhà có đúng tỉ lệ và ánh sáng chủ đề.",
          startDay: 13,
          endDay: 26,
          routine: "Dán thêm chi tiết kiến trúc",
          minutes: 25,
          checklist: ["Dán từng mặt tiền", "Kiểm tra tỉ lệ với bản vẽ"],
        },
        {
          title: "Đèn & hiệu ứng",
          objective: "Dải LED neon và hiệu ứng mưa tạo đúng không khí.",
          startDay: 27,
          endDay: 40,
          routine: "Đo lại dải LED & hiệu chỉnh hiệu ứng",
          minutes: 20,
          checklist: ["Đo dòng cho từng đoạn LED", "Chỉnh hiệu ứng mưa"],
        },
      ],
    },
    {
      name: "Ủ phân hữu cơ Bokashi",
      icon: "recycling",
      startOffset: 11,
      totalDays: 30,
      phases: [
        {
          title: "Chuẩn bị men & nguyên liệu",
          objective: "Men Bokashi sống và nguyên liệu đã qua xử lý.",
          startDay: 1,
          endDay: 8,
          routine: "Kiểm tra men và phun tưới nguyên liệu",
          minutes: 15,
          checklist: ["Kiểm tra men có sống", "Phun tưới mẻ đầu tiên"],
        },
        {
          title: "Ủ các mẻ đầu",
          objective: "Các mẻ đầu ủ đúng thời gian và nhiệt độ.",
          startDay: 9,
          endDay: 20,
          routine: "Kiểm tra nhiệt độ thùng ủ và đảo mẻ",
          minutes: 15,
          checklist: ["Ghi nhiệt độ thùng ủ", "Đảo mẻ theo lịch"],
        },
        {
          title: "Bón từng đợt & thu hoạch",
          objective: "Bón đúng liều và thu hoạch mẻ đầu.",
          startDay: 21,
          endDay: 30,
          routine: "Bón phân hữu cơ và ghi nhận độ ẩm",
          minutes: 15,
          checklist: ["Bón theo bảng liều", "Ghi nhận độ ẩm sau mỗi đợt"],
        },
      ],
    },
  ];

  for (const side of sideProjects) {
    const [project] = await db
      .insert(s.projects)
      .values({
        userId: user.id,
        name: side.name,
        icon: side.icon,
        startDate: localDate(-side.startOffset),
        totalDays: side.totalDays,
        budgetVnd: 0,
        expectedRevenueVnd: 0,
      })
      .returning();
    if (!project) throw new Error(`${side.name} insert failed`);
    await seedStages(project.id, side.phases);
    await seedPhaseMilestones(project.id, side.phases, side.totalDays);
    await seedDayPlans(project.id, side.totalDays, side.phases);
  }
  const projectId = main.id;

  const PHASES: SeedPhase[] = [
    {
      title: "Gieo hạt & Sinh trưởng",
      objective: "Hạt nảy mầm đều, cây con khỏe và bám được giàn.",
      startDay: 1,
      endDay: 14,
      routine: "Tưới buổi sáng & kiểm tra độ ẩm",
      minutes: 10,
      checklist: ["Kiểm tra độ ẩm đất bằng tay", "Tưới quanh gốc, tránh út lá"],
    },
    {
      title: "Ra hoa & Thụ phấn tập trung",
      objective: "Hoa cái nở đều và được thụ phấn đúng thời điểm.",
      startDay: 15,
      endDay: 27,
      routine: "Kiểm tra hoa cái nở & tưới nhẹ",
      minutes: 10,
      checklist: ["Đếm hoa cái đang nở", "Tưới nhẹ khi trời mát"],
    },
    {
      title: "Nuôi quả & Phòng bệnh",
      objective: "Quả lớn đều, lá xanh và không sâu bệnh.",
      startDay: 28,
      endDay: 45,
      routine: "Tưới, nhặt lá & kiểm tra sâu bệnh",
      minutes: 15,
      checklist: ["Nhặt lá vàng, lá sát gốc", "Kiểm tra mặt dưới lá cho sâu"],
    },
  ];

  await seedStages(projectId, PHASES);

  type M = Omit<typeof s.milestones.$inferInsert, "projectId">;
  const milestones: M[] = [
    { day: 1, label: "Gieo hạt", title: "N01: Gieo hạt & Ủ ẩm", icon: "check" },
    { day: 2, label: "Nứt nanh", title: "N02 - N03: Nứt nanh" },
    { day: 4, label: "Nảy mầm", title: "N04: Nảy mầm & Ra lá mầm" },
    { day: 6, label: "Ra lá thật", title: "N06: Ra lá thật" },
    { day: 8, label: "Lên giàn", title: "N08: Cho leo giàn lưới" },
    { day: 10, label: "Bón thúc đợt 1", title: "N10: Bón thúc đợt 1" },
    { day: 12, label: "Bón lót", title: "N12: Bón hữu cơ Bokashi" },
    { day: 14, label: "Tỉa nhánh", title: "N14: Cắt tỉa nhánh phụ" },
    { day: 15, label: "Kiểm tra ẩm", title: "N15: Kiểm tra ẩm & Chuẩn bị thụ phấn" },
    { day: 16, label: "Thụ phấn đợt 1", title: "N16: Thụ phấn hoa cái đợt 1 & tỉa chồi nách 1-5" },
    { day: 17, label: "Mua Kali", title: "N17: Mua phân Kali hữu cơ & chuẩn bị tưới", icon: "shopping_basket", kind: "shopping" },
    { day: 18, label: "Đợt 2", title: "N18: Thụ phấn đợt 2 & Bọc lưới chùm hoa" },
    { day: 20, label: "Kiểm tra rễ", title: "N20: Kiểm tra phát triển rễ" },
    { day: 22, label: "Bọc trái", title: "N22: Bọc túi bảo vệ trái non", icon: "shield" },
    { day: 25, label: "Bón thúc kali", title: "N25: Bón thúc kali nuôi quả" },
    { day: 28, label: "Tỉa ngọn", title: "N28: Bấm ngọn thân chính ở lá 22" },
    { day: 32, label: "Phòng bọ trắng", title: "N32: Phòng ngừa bọ phấn trắng" },
    { day: 35, label: "Soi sâu", title: "N35: Soi camera AI phát hiện phấn trắng và sâu rầy", icon: "pest_control" },
    { day: 40, label: "Kiểm tra dưa", title: "N40: Kiểm tra kích thước dưa" },
    { day: 45, label: "Thu hoạch", title: "N45: Thu hoạch dưa leo đợt 1 (Đích đến chu kỳ 45 ngày)", icon: "flag", kind: "target" },
  ];
  await db.insert(s.milestones).values(milestones.map((m) => ({ ...m, projectId })));

  const plans = await seedDayPlans(projectId, 45, PHASES, {
    [CURRENT_DAY]: {
      title: "Thụ phấn hoa cái đợt 1 & Tỉa chồi nách mắt lá 1-5",
      summary: "Tranh thủ phấn bung khỏe sáng sớm, đồng thời tỉa nhánh phụ để dồn dinh dưỡng nuôi quả non.",
      goldenStart: "07:00",
      goldenEnd: "09:30",
      steps: [
        {
          title: "Khảo sát & đánh dấu hoa cái nở sáng nay",
          description: "Đã phát hiện và đánh dấu 3 hoa cái trên giàn số 1.",
          status: "done",
          completedAt: todayAt("07:15"),
        },
        {
          title: "Thu phấn hoa đực & quét đều đầu nhụy hoa cái",
          description: "Vặt cánh hoa đực, dùng cọ số 4 xoa nhẹ hạt phấn 3 vòng quanh nhụy hoa cái.",
          status: "doing",
          minutes: 15,
          clipSeconds: 30,
          hasCameraShortcut: true,
          items: [
            { label: "Hái 2 hoa đực vừa bung phấn", done: true },
            { label: "Thụ phấn hoa cái #1 (mắt lá 7)" },
            { label: "Thụ phấn hoa cái #2 & #3 (mắt lá 8, 9)" },
          ],
        },
        {
          title: "Tỉa sạch chồi nách và tua cuốn từ mắt lá 1 - 5",
          description: "Cắt vát 45 độ sát nách lá, tạo độ thoáng gốc ngừa nấm mốc.",
          minutes: 15,
        },
        {
          title: "Chụp ảnh hoa đã thụ phấn lưu nhật ký",
          requiresPhoto: true,
          photo: {
            filename: "SNAP-0822.JPG",
            url: "https://lh3.googleusercontent.com/aida-public/AB6AXyCbnR-5AAytL_JbMbferbq0oKj-DLy-kVH5Ps_ALoTOmsjjPf9McI2n0d2g_oO7zW_D9WDcDFBPZyS-5roZBX9hihG2Pznuf8E9KVvtvr8VwS8_AwqMTDMBObmfZwQZNt8uTArzMqwmImC_KWxCzAXFkVXKpbC8l8rmNN03cCk6tvdtI7bFBVTW1QoBZx06dS9d1OW35jBOpdZyNTaJap5PBfqFu3dGhlmUr9nz1gPUAVYA0BL1phg",
          },
        },
      ],
    },
    17: {
      title: "Kiểm tra đậu quả & tưới chuối Kali",
      summary: "Kiểm tra quả đã đậu và bổ sung kali hữu cơ.",
      steps: [{ title: "Kiểm tra đậu quả & tưới chuối Kali", minutes: 20 }],
    },
    18: {
      title: "Bọc lưới ngừa ruồi vàng đục quả",
      summary: "Thụ phấn đợt 2 và bọc lưới chùm hoa.",
      steps: [{ title: "Bọc lưới chùm hoa", minutes: 30 }],
    },
  });
  const dayPlanId = plans.get(CURRENT_DAY)!.id;

  // The purchases of the plan, on the day they were bought, with what they cost.
  const purchases = [
    { day: 1, name: "Hạt giống dưa leo Nhật", icon: "science", quantity: "x1", price: 120_000 },
    { day: 4, name: "Giá thể & chậu", icon: "handyman", quantity: "x1", price: 310_000 },
    { day: 8, name: "Giàn lưới", icon: "settings_input_component", quantity: "x1", price: 180_000 },
    { day: 12, name: "Phân Bokashi", icon: "recycling", quantity: "10kg", price: 95_000 },
    { day: 14, name: "Dụng cụ tỉa", icon: "content_cut", quantity: "x1", price: 140_000 },
  ];
  await db.insert(s.supplies).values([
    ...purchases.map((purchase) => ({
      dayPlanId: plans.get(purchase.day)!.id,
      name: purchase.name,
      icon: purchase.icon,
      quantity: purchase.quantity,
      available: true,
      unitPriceVnd: purchase.price,
      actualPriceVnd: purchase.price,
      buyByDay: purchase.day,
      boughtDay: purchase.day,
    })),
    { dayPlanId, name: "Cọ mềm số 4", icon: "brush", quantity: "x1" },
    { dayPlanId, name: "Kéo tỉa mũi nhọn", icon: "content_cut", quantity: "x1" },
    { dayPlanId, name: "Cồn 70° sát khuẩn", icon: "sanitizer", quantity: "100ml" },
  ]);

  await db.insert(s.expenses).values([
    { projectId, day: 1, label: "Hạt giống dưa leo Nhật", amountVnd: 120_000 },
    { projectId, day: 4, label: "Giá thể & chậu", amountVnd: 310_000 },
    { projectId, day: 8, label: "Giàn lưới", amountVnd: 180_000 },
    { projectId, day: 12, label: "Phân Bokashi", amountVnd: 95_000 },
    { projectId, day: 14, label: "Dụng cụ tỉa", amountVnd: 140_000 },
  ]);

  const [hub] = await db
    .insert(s.hubs)
    .values({ projectId, name: "Hub v2", location: "Ban công T4", batteryPct: 94, lastSeenAt: new Date(Date.now() - 12_000), config: DEMO_HUB_CONFIG })
    .returning();
  if (!hub) throw new Error("hub insert failed");
  await db.insert(s.devices).values([
    { hubId: hub.id, kind: "gateway", name: "ESP32 Gateway", status: "ok" },
    { hubId: hub.id, kind: "soil_probe", name: "Đầu dò ẩm #1 & #2", status: "warning", displayValue: "42%" },
    { hubId: hub.id, kind: "valve", name: "Van Solenoid tưới", status: "ok", displayValue: "16:30" },
    {
      hubId: hub.id, kind: "camera", name: "Cam-01", status: "ok",
      meta: {
        label: "Cam-01 (Góc giàn tầng 2)", resolution: "1080p", fps: 24,
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAmaH5bu4ORRgH40NUSyv8WLwFyhwLDpYdbFKMo6IWYZ4HCo0Q8qMyPzmuAdlCnfzFF2rKOA3ZVjlyHHPINPRXL5DJ0s5Caj8wFil_MeX_ES0ljSBTpZowuT2TdmDVt6gsSwx7xJnjs9UxjlnstjQ01yAMKqaQm3LuHH-YdxD8jwSQKqRNz1h7OxRoDrxEen3r7NQsjJRbAkvq1CCkRQ8jvcWsbjQkP7_70oYtvg6uthfVsXwpU-g",
      },
    },
  ]);

  await db.insert(s.sensorTargets).values([
    { projectId, metric: "air_temperature", min: 24, max: 30 },
    { projectId, metric: "air_humidity", min: 65, max: 75 },
    { projectId, metric: "soil_moisture", min: 45, max: 70 },
    { projectId, metric: "substrate_ph", min: 6.0, max: 6.8 },
    { projectId, metric: "light_intensity", min: 30_000, max: 60_000 },
  ]);

  const POINTS = 32; // two readings per day for 16 days
  const stepMs = (CURRENT_DAY * DAY_MS) / POINTS;
  const specs = [
    { metric: "air_temperature", base: 26.8, amp: 2.2, last: 28.4, seed: 1 },
    { metric: "air_humidity", base: 69, amp: 4, last: 68, seed: 2 },
    { metric: "soil_moisture", base: 55, amp: 14, last: 42, seed: 3 },
    { metric: "substrate_ph", base: 6.35, amp: 0.2, last: 6.3, seed: 4 },
    { metric: "light_intensity", base: 30_000, amp: 9_000, last: 42_000, seed: 5 },
  ] as const;
  const now = Date.now();
  await db.insert(s.sensorReadings).values(
    specs.flatMap(({ metric, base, amp, last, seed }) =>
      series(POINTS, base, amp, last, seed).map((value, i) => ({
        projectId,
        metric,
        value: Math.round(value * 100) / 100,
        recordedAt: new Date(now - (POINTS - 1 - i) * stepMs),
      })),
    ),
  );

  await db.insert(s.aiInsights).values([
    { projectId, kind: "camera", body: "Camera phát hiện **3 hoa cái mới nở** tại mắt lá số 7, 8 và 9. Đã sẵn sàng thụ phấn!" },
    { projectId, kind: "day", day: CURRENT_DAY, body: "Đã tự động hoãn tưới (ẩm 68%, 28.4°C) để bảo vệ phấn hoa.", confidencePct: 98 },
  ]);

  await db.insert(s.automationRules).values([
    { projectId, position: 1, name: "Tưới nhỏ giọt bổ sung", condition: "Đất < 35% sau 16:30 • Van #1", enabled: true },
    { projectId, position: 2, name: "Quạt giảm nhiệt", condition: "> 33.5°C • Quạt 12V", enabled: true },
    { projectId, position: 3, name: "Cảnh báo sâu đêm", condition: "Bật hồng ngoại từ 21:00", enabled: false },
  ]);

  await seedOfflineHub(user.id);

  console.log(`Seeded demo user ${email} with project ${projectId}`);
}

/**
 * A second IoT project whose hub stopped reporting: it renders the "no connect" state
 * (offline chip, dimmed sensors, RTSP lost, safe mode) so the state can be seen.
 */
async function seedOfflineHub(userId: string) {
  const CURRENT = 9;
  const [greenhouse] = await db
    .insert(s.projects)
    .values({
      userId,
      name: "Vườn rau nhà kính tầng 5",
      icon: "sensors",
      startDate: localDate(-(CURRENT - 1)),
      totalDays: 30,
      iotEnabled: true,
      budgetVnd: 1_500_000,
      expectedRevenueVnd: 0,
    })
    .returning();
  if (!greenhouse) throw new Error("greenhouse insert failed");
  const projectId = greenhouse.id;

  const PHASES: SeedPhase[] = [
    {
      title: "Gieo hạt & Ủ ẩm",
      objective: "Hạt nảy mầm đều và luống giữ ẩm ổn định.",
      startDay: 1,
      endDay: 10,
      routine: "Tưới luống & kiểm tra độ ẩm",
      minutes: 10,
      checklist: ["Tưới đều tay, tránh đọng nước", "Kiểm tra độ ẩm luống bằng tay"],
    },
    {
      title: "Cây con & Tỉa chồi",
      objective: "Cây con khỏe và được tỉa chồi đúng thời điểm.",
      startDay: 11,
      endDay: 20,
      routine: "Tỉa chồi & bón phân hữu cơ",
      minutes: 15,
      checklist: ["Tỉa chồi già", "Bón phân hữu cơ theo lịch"],
    },
    {
      title: "Bón thúc & Phòng bệnh",
      objective: "Rau đủ dinh dưỡng, lá xanh và không sâu bệnh.",
      startDay: 21,
      endDay: 30,
      routine: "Bón thúc & kiểm tra sâu bệnh",
      minutes: 15,
      checklist: ["Bón thúc theo bảng liều", "Soi lá tìm sâu, rệp"],
    },
  ];
  await seedStages(projectId, PHASES);

  await db.insert(s.milestones).values([
    { projectId, day: 1, label: "Gieo hạt", title: "N01: Gieo hạt & Ủ ẩm", icon: "check" },
    { projectId, day: 5, label: "Nảy mầm", title: "N05: Nảy mầm & Ra lá mầm" },
    { projectId, day: 9, label: "Tưới tay", title: `N${CURRENT}: Tưới tay & Bổ sung nước` },
    { projectId, day: 12, label: "Mua phân", title: "N12: Mua phân hữu cơ", icon: "shopping_basket", kind: "shopping" },
    { projectId, day: 30, label: "Thu hoạch", title: "N30: Thu hoạch đợt 1", icon: "flag", kind: "target" },
  ]);

  const plans = await seedDayPlans(projectId, 30, PHASES, {
    [CURRENT]: {
      title: "Tưới tay & bổ sung nước cho luống rau",
      summary: "Hub đang mất kết nối nên chuyển sang tưới tay theo lịch và kiểm tra độ ẩm bằng tay.",
      steps: [
        {
          title: "Kiểm tra độ ẩm luống bằng tay",
          description: "Nhúng ngón tay sâu 3cm vào giá thể, đã khô nhẹ.",
          status: "done",
          completedAt: todayAt("07:10"),
        },
        {
          title: "Tưới tay luống rau theo bộ chuôi 8L",
          description: "Tưới đều tay, tránh đọng nước trên lá non.",
          minutes: 25,
          items: [
            { label: "Bình 8L đầy nước tưới", done: true },
            { label: "Tưới mỗi luống 2 lần" },
          ],
        },
        {
          title: "Ghi nhận chỉ số để đối chiếu khi hub kết nối lại",
          description: "Ghi nhiệt độ và độ ẩm ước vào sổ tay để so sánh với dữ liệu cảm biến.",
          minutes: 10,
          items: [{ label: "Ghi nhiệt độ ước tay" }],
        },
      ],
    },
  });
  const plan = plans.get(CURRENT)!;

  await db.insert(s.supplies).values([
    { dayPlanId: plan.id, name: "Bình tưới 8L", icon: "sanitizer", quantity: "x1", available: true },
    { dayPlanId: plan.id, name: "Que đo độ ẩm tay", icon: "sensors", quantity: "x1", available: true },
  ]);

  // The hub stopped reporting 42 minutes ago: the UI reads this as "no connect".
  const [hub] = await db
    .insert(s.hubs)
    .values({
      projectId,
      name: "Hub v2",
      location: "Kệ sắp tầng 5",
      batteryPct: 12,
      online: false,
      lastSeenAt: new Date(Date.now() - 42 * 60_000),
      config: DEMO_HUB_CONFIG,
    })
    .returning();
  if (!hub) throw new Error("greenhouse hub insert failed");

  await db.insert(s.devices).values([
    { hubId: hub.id, kind: "gateway", name: "ESP32 Gateway", status: "offline" },
    { hubId: hub.id, kind: "soil_probe", name: "Đầu dò ẩm #1 & #2", status: "offline" },
    { hubId: hub.id, kind: "valve", name: "Van Solenoid tưới", status: "offline" },
    {
      hubId: hub.id, kind: "camera", name: "Cam-01", status: "offline",
      meta: {
        label: "Cam-01 (Góc luống rau)", resolution: "1080p", fps: 24,
        imageUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAmaH5bu4ORRgH40NUSyv8WLwFyhwLDpYdbFKMo6IWYZ4HCo0Q8qMyPzmuAdlCnfzFF2rKOA3ZVjlyHHPINPRXL5DJ0s5Caj8wFil_MeX_ES0ljSBTpZowuT2TdmDVt6gsSwx7xJnjs9UxjlnstjQ01yAMKqaQm3LuHH-YdxD8jwSQKqRNz1h7OxRoDrxEen3r7NQsjJRbAkvq1CCkRQ8jvcWsbjQkP7_70oYtvg6uthfVsXwpU-g",
      },
    },
  ]);

  await db.insert(s.sensorTargets).values([
    { projectId, metric: "air_temperature", min: 24, max: 30 },
    { projectId, metric: "air_humidity", min: 65, max: 75 },
    { projectId, metric: "soil_moisture", min: 45, max: 70 },
    { projectId, metric: "substrate_ph", min: 6.0, max: 6.8 },
    { projectId, metric: "light_intensity", min: 30_000, max: 60_000 },
  ]);

  // The stored readings stop 42 minutes ago, where the hub went quiet.
  const POINTS = 12;
  const stepMs = 30 * 60_000;
  const end = Date.now() - 42 * 60_000;
  const specs = [
    { metric: "air_temperature", base: 27.5, amp: 1.6, last: 29.1, seed: 11 },
    { metric: "air_humidity", base: 72, amp: 3, last: 66, seed: 12 },
    { metric: "soil_moisture", base: 52, amp: 7, last: 38, seed: 13 },
    { metric: "substrate_ph", base: 6.4, amp: 0.15, last: 6.2, seed: 14 },
    { metric: "light_intensity", base: 34_000, amp: 6_000, last: 41_000, seed: 15 },
  ] as const;
  await db.insert(s.sensorReadings).values(
    specs.flatMap(({ metric, base, amp, last, seed }) =>
      series(POINTS, base, amp, last, seed).map((value, i) => ({
        projectId,
        metric,
        value: Math.round(value * 100) / 100,
        recordedAt: new Date(end - (POINTS - 1 - i) * stepMs),
      })),
    ),
  );

  await db.insert(s.aiInsights).values([
    { projectId, kind: "camera", body: "Camera phát hiện **2 lá rau úng vàng** ở luống 3, cần tưới tay trong hôm nay." },
    { projectId, kind: "day", day: CURRENT, body: "Hub mất kết nối, đã chuyển sang chế độ tưới tay theo lịch.", confidencePct: 74 },
  ]);

  await db.insert(s.automationRules).values([
    { projectId, position: 1, name: "Tưới nhỏ giọt bổ sung", condition: "Đất < 35% sau 16:30 • Van #1", enabled: true },
    { projectId, position: 2, name: "Quạt giảm nhiệt", condition: "> 33.5°C • Quạt 12V", enabled: true },
  ]);
}

main()
  .then(() => client.end())
  .catch(async (e) => {
    console.error(e);
    await client.end();
    process.exit(1);
  });
