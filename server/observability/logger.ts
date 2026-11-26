export function logServerError(
  event: string,
  requestId: string,
  error: unknown,
): void {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
      timestamp: new Date().toISOString(),
    }),
  );
}
