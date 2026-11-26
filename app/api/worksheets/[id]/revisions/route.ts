import { NextResponse } from "next/server";
import { sessionFromRequest } from "../../../../../server/auth/session";
import {
  errorResponse,
  requestIdFor,
  responseHeaders,
} from "../../../../../server/api/http";
import { getWorksheetService } from "../../../../../server/services/container";
import { WorksheetApplicationError } from "../../../../../server/services/worksheet-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = requestIdFor(request);
  try {
    const session = await sessionFromRequest(request);
    if (!session)
      throw new WorksheetApplicationError(
        401,
        "unauthenticated",
        "Authentication is required",
      );
    const { id } = await context.params;
    const revisions = await getWorksheetService().revisions(
      id,
      session.user.id,
    );
    return NextResponse.json(
      { data: revisions },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
