import { describe, expect, it } from "vitest";
import { parseMathStatement } from "../../domain/expressions/parser";
import {
  DEFAULT_PAGE,
  type WorksheetDocument,
} from "../../domain/worksheet/model";
import type {
  SaveOutcome,
  WorksheetPermission,
  WorksheetRecord,
  WorksheetRepository,
} from "../repositories/worksheet-repository";
import {
  WorksheetApplicationError,
  WorksheetService,
} from "./worksheet-service";

const document: WorksheetDocument = {
  schemaVersion: 1,
  id: "doc-1",
  title: "Torque",
  settings: { page: DEFAULT_PAGE, grid: { visible: true, spacing: 4.25 } },
  regions: [
    {
      id: "formula",
      type: "math",
      content: parseMathStatement("torque := force * arm"),
      position: { x: 10, y: 20 },
      zIndex: 0,
    },
  ],
};

class TestRepository implements WorksheetRepository {
  permission: WorksheetPermission = "owner";
  current: WorksheetRecord = {
    document,
    ownerId: "owner",
    permission: "owner",
    revision: 1,
    updatedAt: new Date(0),
  };
  outcome: SaveOutcome = {
    kind: "saved",
    record: { ...this.current, revision: 2 },
    idempotent: false,
  };
  async create(): Promise<WorksheetRecord> {
    return this.current;
  }
  async listAccessible(): Promise<WorksheetRecord[]> {
    return [this.current];
  }
  async findAccessible(
    _id: string,
    userId: string,
  ): Promise<WorksheetRecord | null> {
    return userId === "owner" || userId === "editor" || userId === "viewer"
      ? { ...this.current, permission: this.permission }
      : null;
  }
  async save(): Promise<SaveOutcome> {
    return this.outcome;
  }
  async softDelete(): Promise<boolean> {
    return true;
  }
  async grantPermission(): Promise<void> {}
  async listRevisions() {
    return [];
  }
}

describe("worksheet application service", () => {
  it("rejects viewers before attempting document persistence", async () => {
    const repository = new TestRepository();
    repository.permission = "viewer";
    const service = new WorksheetService(repository);
    await expect(
      service.save("doc-1", "viewer", 1, "save-1", document),
    ).rejects.toMatchObject({ status: 403, code: "forbidden" });
  });

  it("surfaces optimistic concurrency conflicts without replacing the client's document", async () => {
    const repository = new TestRepository();
    repository.outcome = {
      kind: "conflict",
      record: { ...repository.current, revision: 3 },
    };
    const service = new WorksheetService(repository);
    try {
      await service.save("doc-1", "owner", 1, "save-2", document);
      throw new Error("Expected revision conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(WorksheetApplicationError);
      expect(error).toMatchObject({
        status: 409,
        code: "revision_conflict",
        details: { currentRevision: 3 },
      });
    }
  });

  it("validates incoming documents and binds the document ID to the route", async () => {
    const service = new WorksheetService(new TestRepository());
    await expect(
      service.create("owner", { title: "unvalidated" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_document" });
    await expect(
      service.save("other-id", "owner", 1, "save-3", document),
    ).rejects.toMatchObject({ status: 400, code: "invalid_document" });
  });
});
