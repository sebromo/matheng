import { NextResponse } from "next/server";
import { sessionFromRequest } from "../../../server/auth/session";
import {
  errorResponse,
  isRecord,
  readJsonBody,
  requestIdFor,
  responseHeaders,
} from "../../../server/api/http";
import { allowWrite } from "../../../server/api/rate-limit";
import { getWorksheetService } from "../../../server/services/container";
import { WorksheetApplicationError } from "../../../server/services/worksheet-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  try {
    const session = await sessionFromRequest(request);
    if (!session)
      throw new WorksheetApplicationError(
        401,
        "unauthenticated",
        "Authentication is required",
      );
    const records = await getWorksheetService().list(session.user.id);
    return NextResponse.json(
      { data: records },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  try {
    const session = await sessionFromRequest(request);
    if (!session)
      throw new WorksheetApplicationError(
        401,
        "unauthenticated",
        "Authentication is required",
      );
    if (!allowWrite(`create:${session.user.id}`, 20)) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests",
            requestId,
          },
        },
        { status: 429, headers: responseHeaders(requestId) },
      );
    }
    const body = await readJsonBody(request);
    if (!isRecord(body) || !("document" in body))
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        "A worksheet document is required",
      );
    const record = await getWorksheetService().create(
      session.user.id,
      body.document,
    );
    return NextResponse.json(
      { data: record },
      { status: 201, headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
