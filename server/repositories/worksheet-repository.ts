import type { WorksheetDocument } from "../../domain/worksheet/model";

export type WorksheetPermission = "owner" | "editor" | "viewer";

export type WorksheetRecord = {
  document: WorksheetDocument;
  ownerId: string;
  permission: WorksheetPermission;
  revision: number;
  updatedAt: Date;
};

export type SaveOutcome =
  | { kind: "saved"; record: WorksheetRecord; idempotent: boolean }
  | { kind: "conflict"; record: WorksheetRecord }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "idempotency-conflict" };

export type SaveWorksheetInput = {
  worksheetId: string;
  actorId: string;
  expectedRevision: number;
  requestId: string;
  document: WorksheetDocument;
};

export type WorksheetRevisionSummary = {
  revision: number;
  createdBy: string;
  createdAt: Date;
};

export interface WorksheetRepository {
  create(
    ownerId: string,
    document: WorksheetDocument,
  ): Promise<WorksheetRecord>;
  listAccessible(userId: string): Promise<WorksheetRecord[]>;
  findAccessible(
    worksheetId: string,
    userId: string,
  ): Promise<WorksheetRecord | null>;
  save(input: SaveWorksheetInput): Promise<SaveOutcome>;
  softDelete(worksheetId: string, actorId: string): Promise<boolean>;
  grantPermission(
    worksheetId: string,
    userId: string,
    permission: "editor" | "viewer",
  ): Promise<void>;
  listRevisions(worksheetId: string): Promise<WorksheetRevisionSummary[]>;
}
