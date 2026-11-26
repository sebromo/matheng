import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { parseMathStatement } from "../../domain/expressions/parser";
import type { WorksheetDocument } from "../../domain/worksheet/model";
import { schema, users, worksheets } from "../database/schema";
import { DrizzleWorksheetRepository } from "./drizzle-worksheet-repository";
import { WorksheetService } from "../services/worksheet-service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("PostgreSQL worksheet repository", () => {
  let client: ReturnType<typeof postgres>;
  let database: PostgresJsDatabase<typeof schema>;
  let repository: DrizzleWorksheetRepository;
  let service: WorksheetService;
  let ownerId: string;
  let editorId: string;
  let viewerId: string;

  beforeAll(async () => {
    client = postgres(databaseUrl!, { max: 1 });
    database = drizzle(client, { schema });
    repository = new DrizzleWorksheetRepository(database);
    service = new WorksheetService(repository);
    ownerId = crypto.randomUUID();
    editorId = crypto.randomUUID();
    viewerId = crypto.randomUUID();
    await database.insert(users).values(
      [ownerId, editorId, viewerId].map((id) => ({
        id,
        name: "Integration User",
        email: `${id}@example.invalid`,
        emailVerified: true,
      })),
    );
  });

  afterAll(async () => {
    if (database && ownerId)
      await database.delete(worksheets).where(eq(worksheets.ownerId, ownerId));
    if (database && ownerId)
      await database.delete(users).where(eq(users.id, ownerId));
    if (database && editorId)
      await database.delete(users).where(eq(users.id, editorId));
    if (database && viewerId)
      await database.delete(users).where(eq(users.id, viewerId));
    if (client) await client.end({ timeout: 5 });
  });

  it("creates, retrieves, shares, saves revisions, and rejects stale updates", async () => {
    const initial = createDocument("initial");
    const created = await service.create(ownerId, initial);
    expect(created.revision).toBe(1);
    expect(await service.create(ownerId, initial)).toMatchObject({
      revision: 1,
      ownerId,
      document: { id: initial.id },
    });
    expect((await service.get(initial.id, ownerId)).permission).toBe("owner");
    await expect(
      service.get(initial.id, crypto.randomUUID()),
    ).rejects.toMatchObject({ status: 404 });

    await service.grantPermission(initial.id, ownerId, editorId, "editor");
    await service.grantPermission(initial.id, ownerId, viewerId, "viewer");
    expect((await service.get(initial.id, editorId)).permission).toBe("editor");
    expect((await service.get(initial.id, viewerId)).permission).toBe("viewer");

    const changed = { ...initial, title: "Updated calculation" };
    const saved = await service.save(
      initial.id,
      editorId,
      1,
      "save-editor-1",
      changed,
    );
    expect(saved.revision).toBe(2);
    expect(saved.document.title).toBe("Updated calculation");

    const retry = await service.save(
      initial.id,
      editorId,
      1,
      "save-editor-1",
      changed,
    );
    expect(retry.revision).toBe(2);
    await expect(
      service.save(initial.id, viewerId, 2, "save-viewer-1", changed),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.save(initial.id, ownerId, 1, "save-owner-stale", changed),
    ).rejects.toMatchObject({
      status: 409,
      code: "revision_conflict",
      details: { currentRevision: 2 },
    });

    const revisions = await service.revisions(initial.id, viewerId);
    expect(revisions.map((revision) => revision.revision)).toEqual([2, 1]);
  });

  it("rolls back a worksheet insert when the owner foreign key is invalid", async () => {
    const document = createDocument("rollback");
    await expect(
      repository.create(crypto.randomUUID(), document),
    ).rejects.toThrow();
    await expect(service.get(document.id, ownerId)).rejects.toMatchObject({
      status: 404,
    });
  });
});

function createDocument(title: string): WorksheetDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title,
    settings: {
      page: { width: 210, height: 297, unit: "mm" },
      grid: { visible: true, spacing: 4.25 },
    },
    regions: [
      {
        id: "torque",
        type: "math",
        content: parseMathStatement("torque := force * arm"),
        position: { x: 14.7, y: 62.37 },
        zIndex: 0,
      },
    ],
  };
}
