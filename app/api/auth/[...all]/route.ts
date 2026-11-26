import type { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "../../../../server/auth/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: NextRequest) {
  return toNextJsHandler(getAuth()).POST(request);
}
