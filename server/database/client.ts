import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let database: Database | undefined;
let client: ReturnType<typeof postgres> | undefined;

export function getDatabase(): Database {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "DATABASE_URL must be configured for server database access",
    );
  client = postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    prepare: false,
  });
  database = drizzle(client, { schema });
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (client) await client.end({ timeout: 5 });
  client = undefined;
  database = undefined;
}
