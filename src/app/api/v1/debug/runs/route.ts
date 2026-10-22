import { NextResponse } from "next/server";
import { debugEnabled, listDebugRuns } from "@/server/debug";

export const dynamic = "force-dynamic";

export function GET() {
  if (!debugEnabled()) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  return NextResponse.json({ runs: listDebugRuns() });
}
