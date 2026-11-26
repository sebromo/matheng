import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDatabase } from "../../../../server/database/client";
import { logServerError } from "../../../../server/observability/logger";
import { requestIdFor } from "../../../../server/api/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  try {
    await getDatabase().execute(sql`select 1`);
    return NextResponse.json(
      { status: "ok", database: "ok", requestId },
      { headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logServerError("health.database_unavailable", requestId, error);
    return NextResponse.json(
      { status: "unavailable", database: "unavailable", requestId },
      {
        status: 503,
        headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
      },
    );
  }
}
