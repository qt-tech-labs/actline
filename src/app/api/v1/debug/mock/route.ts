import { NextResponse } from "next/server";
import { debugEnabled } from "@/server/debug";
import { generateTemplateBlueprint } from "@/server/services/blueprint";

export const dynamic = "force-dynamic";

/** A complete, valid plan to start the debug drawer's mock from. */
export function GET() {
  if (!debugEnabled()) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  const blueprint = generateTemplateBlueprint({
    prompt: "Trồng rau thơm và rau ăn lá trên ban công 3m2, có tưới tự động",
    totalDays: 30,
    dailyMinutes: 45,
    budgetVnd: 3_000_000,
    experience: "beginner",
    iotEnabled: null,
  });
  return NextResponse.json({ plan: { ...blueprint, engine: "ai", model: "mock" } });
}
