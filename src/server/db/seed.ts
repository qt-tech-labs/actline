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

  await db.insert(s.projects).values([
    { userId: user.id, name: "Robot telepresence v2", icon: "precision_manufacturing", startDate: localDate(-27), totalDays: 60, budgetVnd: 0, expectedRevenueVnd: 0 },
    { userId: user.id, name: "Mô hình sa bàn Cyberpunk 1:35", icon: "architecture", startDate: localDate(-4), totalDays: 40, budgetVnd: 0, expectedRevenueVnd: 0 },
    { userId: user.id, name: "Ủ phân hữu cơ Bokashi", icon: "recycling", startDate: localDate(-11), totalDays: 30, budgetVnd: 0, expectedRevenueVnd: 0 },
  ]);
  const projectId = main.id;

  await db.insert(s.projectStages).values([
    { projectId, name: "Giai đoạn 1: Gieo hạt & Sinh trưởng", startDay: 1, endDay: 14 },
    { projectId, name: "Giai đoạn 2: Ra hoa & Thụ phấn tập trung", startDay: 15, endDay: 27 },
    { projectId, name: "Giai đoạn 3: Nuôi quả & Phòng bệnh", startDay: 28, endDay: 45 },
  ]);

  type M = Omit<typeof s.milestones.$inferInsert, "projectId">;
  const milestones: M[] = [
    { day: 1, label: "Gieo hạt", title: "N01: Gieo hạt & Ủ ẩm", icon: "check" },
    { day: 2, label: "", title: "N02 - N03: Nứt nanh", isMinor: true },
    { day: 4, label: "Nảy mầm", title: "N04: Nảy mầm & Ra lá mầm" },
    { day: 6, label: "", title: "N06: Ra lá thật", isMinor: true },
    { day: 8, label: "Lên giàn", title: "N08: Cho leo giàn lưới" },
    { day: 10, label: "", title: "N10: Bón thúc đợt 1", isMinor: true },
    { day: 12, label: "Bón lót", title: "N12: Bón hữu cơ Bokashi" },
    { day: 14, label: "Tỉa nhánh", title: "N14: Cắt tỉa nhánh phụ" },
    { day: 15, label: "Kiểm tra ẩm", title: "N15: Kiểm tra ẩm & Chuẩn bị thụ phấn" },
    { day: 16, label: "Thụ phấn đợt 1", title: "Hôm nay (N16): Thụ phấn hoa cái đợt 1 & tỉa chồi nách 1-5" },
    { day: 17, label: "Mua Kali", title: "N17 (Ngày mai): Mua phân Kali hữu cơ & chuẩn bị tưới", icon: "shopping_basket", kind: "shopping" },
    { day: 18, label: "Đợt 2", title: "N18: Thụ phấn đợt 2 & Bọc lưới chùm hoa" },
    { day: 20, label: "", title: "N20: Kiểm tra phát triển rễ", isMinor: true },
    { day: 22, label: "Bọc trái", title: "N22: Bọc túi bảo vệ trái non", icon: "shield" },
    { day: 25, label: "", title: "N25: Bón thúc kali nuôi quả", isMinor: true },
    { day: 28, label: "Tỉa ngọn", title: "N28: Bấm ngọn thân chính ở lá 22" },
    { day: 32, label: "", title: "N32: Phòng ngừa bọ phấn trắng", isMinor: true },
    { day: 35, label: "Soi sâu", title: "N35: Soi camera AI phát hiện phấn trắng và sâu rầy", icon: "pest_control" },
    { day: 40, label: "", title: "N40: Kiểm tra kích thước dưa", isMinor: true },
    { day: 45, label: "Thu hoạch", title: "N45: Thu hoạch dưa leo đợt 1 (Đích đến chu kỳ 45 ngày)", icon: "flag", kind: "target" },
  ];
  await db.insert(s.milestones).values(milestones.map((m) => ({ ...m, projectId })));

  const [plan] = await db
    .insert(s.dayPlans)
    .values({
      projectId,
      day: CURRENT_DAY,
      title: "Thụ phấn hoa cái đợt 1 & Tỉa chồi nách mắt lá 1-5",
      summary: "Tranh thủ phấn bung khỏe sáng sớm, đồng thời tỉa nhánh phụ để dồn dinh dưỡng nuôi quả non.",
      goldenStart: "07:00",
      goldenEnd: "09:30",
    })
    .returning();
  if (!plan) throw new Error("plan insert failed");
  const dayPlanId = plan.id;

  await db.insert(s.dayPlans).values([
    { projectId, day: 17, title: "Kiểm tra đậu quả & tưới chuối Kali", summary: "Kiểm tra quả đã đậu và bổ sung kali hữu cơ." },
    { projectId, day: 18, title: "Bọc lưới ngừa ruồi vàng đục quả", summary: "Thụ phấn đợt 2 và bọc lưới chùm hoa." },
  ]);
  // Lookahead needs a time estimate; stored on the first step of each future day.
  const futurePlans = await db.query.dayPlans.findMany({ where: (t, { and, eq, gt }) => and(eq(t.projectId, projectId), gt(t.day, CURRENT_DAY)) });
  for (const p of futurePlans) {
    await db.insert(s.steps).values({ dayPlanId: p.id, position: 1, title: p.title, estimatedMinutes: p.day === 17 ? 20 : 30 });
  }

  const insertedSteps = await db
    .insert(s.steps)
    .values([
      {
        dayPlanId, position: 1, status: "done", completedAt: todayAt("07:15"),
        title: "Khảo sát & đánh dấu hoa cái nở sáng nay",
        description: "Đã phát hiện và đánh dấu 3 hoa cái trên giàn số 1.",
      },
      {
        dayPlanId, position: 2, status: "doing", estimatedMinutes: 15, clipSeconds: 30, hasCameraShortcut: true,
        title: "Thu phấn hoa đực & quét đều đầu nhụy hoa cái",
        description: "Vặt cánh hoa đực, dùng cọ số 4 xoa nhẹ hạt phấn 3 vòng quanh nhụy hoa cái.",
      },
      {
        dayPlanId, position: 3, estimatedMinutes: 15,
        title: "Tỉa sạch chồi nách và tua cuốn từ mắt lá 1 - 5",
        description: "Cắt vát 45 độ sát nách lá, tạo độ thoáng gốc ngừa nấm mốc.",
      },
      { dayPlanId, position: 4, requiresPhoto: true, title: "Chụp ảnh hoa đã thụ phấn lưu nhật ký" },
    ])
    .returning();
  const step = (pos: number) => {
    const found = insertedSteps.find((x) => x.position === pos);
    if (!found) throw new Error(`step ${pos} missing`);
    return found;
  };

  await db.insert(s.stepItems).values([
    { stepId: step(2).id, position: 1, label: "Hái 2 hoa đực vừa bung phấn", done: true },
    { stepId: step(2).id, position: 2, label: "Thụ phấn hoa cái #1 (mắt lá 7)" },
    { stepId: step(2).id, position: 3, label: "Thụ phấn hoa cái #2 & #3 (mắt lá 8, 9)" },
  ]);
  await db.insert(s.stepPhotos).values({
    stepId: step(4).id,
    filename: "SNAP-0822.JPG",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbnR-5AAytL_JbMbferbq0oKj-DLy-kVH5Ps_ALoTOmsjjPf9McI2n0d2g_oO7zW_D9WDcDFBPZyS-5roZBX9hihG2Pznuf8E9KVvtvr8VwS8_AwqMTDMBObmfZwQZNt8uTArzMqwmImC_KWxCzAXFkVXKpbC8l8rmNN03cCk6tvdtI7bFBVTW1QoBZx06S9d1OW35jBOpdZyNTaJap5PBfqFu3dGhlmUr9nz1gPUAVYA0BL1phg",
  });

  await db.insert(s.supplies).values([
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

  console.log(`Seeded demo user ${email} with project ${projectId}`);
}

main()
  .then(() => client.end())
  .catch(async (e) => {
    console.error(e);
    await client.end();
    process.exit(1);
  });
