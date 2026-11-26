import { and, desc, eq, isNull, or } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";
import { validateWorksheetDocument } from "../../domain/worksheet/validation";
import type { Database } from "../database/client";
import {
  auditEvents,
  worksheetPermissions,
  worksheetRevisions,
  worksheets,
} from "../database/schema";
import type {
  SaveOutcome,
  SaveWorksheetInput,
  WorksheetPermission,
  WorksheetRecord,
  WorksheetRepository,
  WorksheetRevisionSummary,
} from "./worksheet-repository";

export class DrizzleWorksheetRepository implements WorksheetRepository {
  constructor(private readonly database: Database) {}

  async create(
    ownerId: string,
    document: WorksheetRecord["document"],
  ): Promise<WorksheetRecord> {
    const now = new Date();
    return this.database.transaction(async (transaction) => {
      const [inserted] = await transaction
        .insert(worksheets)
        .values({
          id: document.id,
          ownerId,
          title: document.title,
          schemaVersion: document.schemaVersion,
          revision: 1,
          content: document,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: worksheets.id })
        .returning();

      if (!inserted) {
        const [existing] = await transaction
          .select()
          .from(worksheets)
          .where(eq(worksheets.id, document.id))
          .for("update")
          .limit(1);
        if (!existing || existing.ownerId !== ownerId || existing.deletedAt) {
          throw new Error("Worksheet ID is unavailable");
        }
        return toRecord(existing, ownerId, null);
      }

      await transaction.insert(worksheetRevisions).values({
        id: crypto.randomUUID(),
        worksheetId: document.id,
        revisionNumber: 1,
        content: document,
        schemaVersion: document.schemaVersion,
        createdBy: ownerId,
        createdAt: now,
      });
      await transaction.insert(auditEvents).values({
        id: crypto.randomUUID(),
        actorId: ownerId,
        resourceType: "worksheet",
        resourceId: document.id,
        action: "worksheet.created",
        metadata: { revision: 1 },
        createdAt: now,
      });
      return {
        document,
        ownerId,
        permission: "owner",
        revision: 1,
        updatedAt: now,
      };
    });
  }

  async listAccessible(userId: string): Promise<WorksheetRecord[]> {
    const rows = await this.database
      .select({
        worksheet: worksheets,
        permission: worksheetPermissions.permission,
      })
      .from(worksheets)
      .leftJoin(
        worksheetPermissions,
        and(
          eq(worksheetPermissions.worksheetId, worksheets.id),
          eq(worksheetPermissions.userId, userId),
        ),
      )
      .where(
        and(
          isNull(worksheets.deletedAt),
          or(
            eq(worksheets.ownerId, userId),
            eq(worksheetPermissions.userId, userId),
          ),
        ),
      )
      .orderBy(desc(worksheets.updatedAt));

    return rows.map(({ worksheet, permission }) =>
      toRecord(worksheet, userId, permission),
    );
  }

  async findAccessible(
    worksheetId: string,
    userId: string,
  ): Promise<WorksheetRecord | null> {
    const [row] = await this.database
      .select({
        worksheet: worksheets,
        permission: worksheetPermissions.permission,
      })
      .from(worksheets)
      .leftJoin(
        worksheetPermissions,
        and(
          eq(worksheetPermissions.worksheetId, worksheets.id),
          eq(worksheetPermissions.userId, userId),
        ),
      )
      .where(and(eq(worksheets.id, worksheetId), isNull(worksheets.deletedAt)))
      .limit(1);
    if (!row || (row.worksheet.ownerId !== userId && !row.permission))
      return null;
    return toRecord(row.worksheet, userId, row.permission);
  }

  async save(input: SaveWorksheetInput): Promise<SaveOutcome> {
    return this.database.transaction(
      async (transaction): Promise<SaveOutcome> => {
        const [current] = await transaction
          .select()
          .from(worksheets)
          .where(
            and(
              eq(worksheets.id, input.worksheetId),
              isNull(worksheets.deletedAt),
            ),
          )
          .for("update")
          .limit(1);
        if (!current) return { kind: "not-found" };

        const permission = await this.permissionFor(
          transaction,
          current.id,
          current.ownerId,
          input.actorId,
        );
        if (!permission || permission === "viewer")
          return { kind: "forbidden" };

        const [duplicateRequest] = await transaction
          .select()
          .from(worksheetRevisions)
          .where(
            and(
              eq(worksheetRevisions.worksheetId, current.id),
              eq(worksheetRevisions.requestId, input.requestId),
            ),
          )
          .limit(1);
        if (duplicateRequest) {
          if (!isDeepStrictEqual(duplicateRequest.content, input.document))
            return { kind: "idempotency-conflict" };
          return {
            kind: "saved",
            idempotent: true,
            record: {
              document: validateWorksheetDocument(duplicateRequest.content),
              ownerId: current.ownerId,
              permission,
              revision: duplicateRequest.revisionNumber,
              updatedAt: duplicateRequest.createdAt,
            },
          };
        }

        if (current.revision !== input.expectedRevision) {
          return {
            kind: "conflict",
            record: toRecord(
              current,
              input.actorId,
              permission === "owner" ? null : permission,
            ),
          };
        }

        const nextRevision = current.revision + 1;
        const now = new Date();
        const [updated] = await transaction
          .update(worksheets)
          .set({
            title: input.document.title,
            schemaVersion: input.document.schemaVersion,
            revision: nextRevision,
            content: input.document,
            updatedAt: now,
          })
          .where(
            and(
              eq(worksheets.id, current.id),
              eq(worksheets.revision, input.expectedRevision),
            ),
          )
          .returning();

        if (!updated) {
          const [latest] = await transaction
            .select()
            .from(worksheets)
            .where(eq(worksheets.id, current.id))
            .limit(1);
          if (!latest) return { kind: "not-found" };
          return {
            kind: "conflict",
            record: toRecord(
              latest,
              input.actorId,
              permission === "owner" ? null : permission,
            ),
          };
        }

        await transaction.insert(worksheetRevisions).values({
          id: crypto.randomUUID(),
          worksheetId: current.id,
          revisionNumber: nextRevision,
          content: input.document,
          schemaVersion: input.document.schemaVersion,
          createdBy: input.actorId,
          requestId: input.requestId,
          createdAt: now,
        });
        await transaction.insert(auditEvents).values({
          id: crypto.randomUUID(),
          actorId: input.actorId,
          resourceType: "worksheet",
          resourceId: current.id,
          action: "worksheet.updated",
          metadata: { revision: nextRevision },
          createdAt: now,
        });

        return {
          kind: "saved",
          idempotent: false,
          record: {
            document: input.document,
            ownerId: updated.ownerId,
            permission,
            revision: nextRevision,
            updatedAt: now,
          },
        };
      },
    );
  }

  async softDelete(worksheetId: string, actorId: string): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const [deleted] = await transaction
        .update(worksheets)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(worksheets.id, worksheetId),
            eq(worksheets.ownerId, actorId),
            isNull(worksheets.deletedAt),
          ),
        )
        .returning({ id: worksheets.id });
      if (!deleted) return false;
      await transaction.insert(auditEvents).values({
        id: crypto.randomUUID(),
        actorId,
        resourceType: "worksheet",
        resourceId: worksheetId,
        action: "worksheet.deleted",
        metadata: {},
        createdAt: new Date(),
      });
      return true;
    });
  }

  async grantPermission(
    worksheetId: string,
    userId: string,
    permission: "editor" | "viewer",
  ): Promise<void> {
    await this.database
      .insert(worksheetPermissions)
      .values({ worksheetId, userId, permission })
      .onConflictDoUpdate({
        target: [worksheetPermissions.worksheetId, worksheetPermissions.userId],
        set: { permission },
      });
  }

  async listRevisions(
    worksheetId: string,
  ): Promise<WorksheetRevisionSummary[]> {
    const rows = await this.database
      .select({
        revision: worksheetRevisions.revisionNumber,
        createdBy: worksheetRevisions.createdBy,
        createdAt: worksheetRevisions.createdAt,
      })
      .from(worksheetRevisions)
      .where(eq(worksheetRevisions.worksheetId, worksheetId))
      .orderBy(desc(worksheetRevisions.revisionNumber));
    return rows;
  }

  private async permissionFor(
    transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
    worksheetId: string,
    ownerId: string,
    userId: string,
  ): Promise<WorksheetPermission | null> {
    if (ownerId === userId) return "owner";
    const [row] = await transaction
      .select({ permission: worksheetPermissions.permission })
      .from(worksheetPermissions)
      .where(
        and(
          eq(worksheetPermissions.worksheetId, worksheetId),
          eq(worksheetPermissions.userId, userId),
        ),
      )
      .limit(1);
    return row?.permission ?? null;
  }
}

function toRecord(
  row: typeof worksheets.$inferSelect,
  userId: string,
  permission: "editor" | "viewer" | null,
): WorksheetRecord {
  const access: WorksheetPermission =
    row.ownerId === userId ? "owner" : (permission ?? "viewer");
  return {
    document: validateWorksheetDocument(row.content),
    ownerId: row.ownerId,
    permission: access,
    revision: row.revision,
    updatedAt: row.updatedAt,
  };
}
