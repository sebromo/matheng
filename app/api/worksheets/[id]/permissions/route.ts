import { NextResponse } from "next/server";
import { sessionFromRequest } from "../../../../../server/auth/session";
import {
  errorResponse,
  isRecord,
  readJsonBody,
  requestIdFor,
  responseHeaders,
} from "../../../../../server/api/http";
import { getWorksheetService } from "../../../../../server/services/container";
import { WorksheetApplicationError } from "../../../../../server/services/worksheet-service";

export const runtime = "nodejs";

export async function POST(
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
    const body = await readJsonBody(request, 16_384);
    if (
      !isRecord(body) ||
      typeof body.userId !== "string" ||
      (body.permission !== "viewer" && body.permission !== "editor")
    ) {
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        "A userId and viewer/editor permission are required",
      );
    }
    await getWorksheetService().grantPermission(
      id,
      session.user.id,
      body.userId,
      body.permission,
    );
    return NextResponse.json(
      {
        data: {
          worksheetId: id,
          userId: body.userId,
          permission: body.permission,
        },
      },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
