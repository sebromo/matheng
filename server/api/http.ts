import { NextResponse } from "next/server";
import { WorksheetApplicationError } from "../services/worksheet-service";
import { logServerError } from "../observability/logger";

export class RequestError extends Error {
  constructor(
    readonly status: 400 | 413,
    readonly code: "invalid_json" | "request_too_large",
    message: string,
  ) {
    super(message);
  }
}

export function requestIdFor(request: Request): string {
  const supplied = request.headers.get("x-request-id");
  return supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

export async function readJsonBody(
  request: Request,
  maxBytes = 2_100_000,
): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestError(
      413,
      "request_too_large",
      "Request body exceeds the allowed size",
    );
  }
  if (!request.body)
    throw new RequestError(
      400,
      "invalid_json",
      "A JSON request body is required",
    );

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RequestError(
        413,
        "request_too_large",
        "Request body exceeds the allowed size",
      );
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(body),
    ) as unknown;
  } catch {
    throw new RequestError(
      400,
      "invalid_json",
      "Request body must be valid JSON",
    );
  }
}

export function errorResponse(error: unknown, requestId: string): NextResponse {
  if (error instanceof WorksheetApplicationError) {
    const { status, code, message, details } = error;
    return NextResponse.json(
      { error: { code, message, details, requestId } },
      { status, headers: responseHeaders(requestId) },
    );
  }
  if (error instanceof RequestError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, requestId } },
      { status: error.status, headers: responseHeaders(requestId) },
    );
  }
  logServerError("api.request_failed", requestId, error);
  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "The request could not be completed",
        requestId,
      },
    },
    {
      status: 500,
      headers: responseHeaders(requestId),
    },
  );
}

export function responseHeaders(requestId: string): HeadersInit {
  return { "Cache-Control": "no-store", "X-Request-Id": requestId };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
