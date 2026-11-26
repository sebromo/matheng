import { NextResponse } from "next/server";
import { sessionFromRequest } from "../../../../server/auth/session";
import {
  errorResponse,
  isRecord,
  readJsonBody,
  requestIdFor,
  responseHeaders,
} from "../../../../server/api/http";
import { allowWrite } from "../../../../server/api/rate-limit";
import { getWorksheetService } from "../../../../server/services/container";
import { WorksheetApplicationError } from "../../../../server/services/worksheet-service";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
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
    const record = await getWorksheetService().get(id, session.user.id);
    return NextResponse.json(
      { data: record },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function PUT(request: Request, context: Context) {
  const requestId = requestIdFor(request);
  try {
    const session = await sessionFromRequest(request);
    if (!session)
      throw new WorksheetApplicationError(
        401,
        "unauthenticated",
        "Authentication is required",
      );
    if (!allowWrite(`save:${session.user.id}`, 120)) {
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
    const { id } = await context.params;
    const body = await readJsonBody(request);
    if (
      !isRecord(body) ||
      !("document" in body) ||
      typeof body.baseRevision !== "number" ||
      typeof body.requestId !== "string"
    ) {
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        "Document, baseRevision, and requestId are required",
      );
    }
    const record = await getWorksheetService().save(
      id,
      session.user.id,
      body.baseRevision,
      body.requestId,
      body.document,
    );
    return NextResponse.json(
      { data: record },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function DELETE(request: Request, context: Context) {
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
    await getWorksheetService().delete(id, session.user.id);
    return new NextResponse(null, {
      status: 204,
      headers: responseHeaders(requestId),
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
