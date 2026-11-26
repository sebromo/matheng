import { validateWorksheetDocument } from "../../domain/worksheet/validation";
import type {
  WorksheetRepository,
  WorksheetRecord,
} from "../repositories/worksheet-repository";

export class WorksheetApplicationError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409,
    readonly code:
      | "invalid_document"
      | "unauthenticated"
      | "forbidden"
      | "not_found"
      | "revision_conflict"
      | "idempotency_conflict",
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class WorksheetService {
  constructor(private readonly repository: WorksheetRepository) {}

  list(userId: string): Promise<WorksheetRecord[]> {
    return this.repository.listAccessible(userId);
  }

  async get(worksheetId: string, userId: string): Promise<WorksheetRecord> {
    const record = await this.repository.findAccessible(worksheetId, userId);
    if (!record)
      throw new WorksheetApplicationError(
        404,
        "not_found",
        "Worksheet not found",
      );
    return record;
  }

  async create(userId: string, input: unknown): Promise<WorksheetRecord> {
    const document = this.validate(input);
    return this.repository.create(userId, document);
  }

  async save(
    worksheetId: string,
    userId: string,
    expectedRevision: number,
    requestId: string,
    input: unknown,
  ): Promise<WorksheetRecord> {
    const current = await this.get(worksheetId, userId);
    if (current.permission === "viewer") {
      throw new WorksheetApplicationError(
        403,
        "forbidden",
        "Viewer access cannot modify worksheets",
      );
    }
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        "A valid base revision is required",
      );
    }
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) {
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        "A valid request ID is required",
      );
    }
    const document = this.validate(input);
    if (document.id !== worksheetId) {
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        "Document ID does not match the worksheet route",
      );
    }

    const outcome = await this.repository.save({
      worksheetId,
      actorId: userId,
      expectedRevision,
      requestId,
      document,
    });
    if (outcome.kind === "saved") return outcome.record;
    if (outcome.kind === "conflict") {
      throw new WorksheetApplicationError(
        409,
        "revision_conflict",
        "Worksheet changed since this draft was loaded",
        {
          currentRevision: outcome.record.revision,
        },
      );
    }
    if (outcome.kind === "idempotency-conflict") {
      throw new WorksheetApplicationError(
        409,
        "idempotency_conflict",
        "Request ID was already used for a different document",
      );
    }
    if (outcome.kind === "forbidden")
      throw new WorksheetApplicationError(
        403,
        "forbidden",
        "Worksheet access does not allow editing",
      );
    throw new WorksheetApplicationError(
      404,
      "not_found",
      "Worksheet not found",
    );
  }

  async delete(worksheetId: string, userId: string): Promise<void> {
    const record = await this.get(worksheetId, userId);
    if (record.permission !== "owner")
      throw new WorksheetApplicationError(
        403,
        "forbidden",
        "Only the owner can delete a worksheet",
      );
    if (!(await this.repository.softDelete(worksheetId, userId))) {
      throw new WorksheetApplicationError(
        404,
        "not_found",
        "Worksheet not found",
      );
    }
  }

  async grantPermission(
    worksheetId: string,
    actorId: string,
    targetUserId: string,
    permission: "editor" | "viewer",
  ): Promise<void> {
    const record = await this.get(worksheetId, actorId);
    if (record.permission !== "owner")
      throw new WorksheetApplicationError(
        403,
        "forbidden",
        "Only the owner can share a worksheet",
      );
    if (
      !targetUserId ||
      targetUserId.length > 128 ||
      targetUserId === actorId
    ) {
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        "Invalid sharing principal",
      );
    }
    await this.repository.grantPermission(
      worksheetId,
      targetUserId,
      permission,
    );
  }

  async revisions(worksheetId: string, userId: string) {
    await this.get(worksheetId, userId);
    return this.repository.listRevisions(worksheetId);
  }

  private validate(input: unknown) {
    try {
      return validateWorksheetDocument(input);
    } catch (error) {
      throw new WorksheetApplicationError(
        400,
        "invalid_document",
        error instanceof Error ? error.message : "Invalid worksheet document",
      );
    }
  }
}
