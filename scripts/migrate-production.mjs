import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationLockClass = 1179793730;
const migrationLockId = 1296648018;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured for production`);
  return value;
}

const databaseUrl = required("DATABASE_URL");
required("POSTGRES_PASSWORD");
const secret = required("BETTER_AUTH_SECRET");
if (Buffer.byteLength(secret) < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 bytes");
}

const authUrl = new URL(required("BETTER_AUTH_URL"));
const publicUrl = new URL(required("NEXT_PUBLIC_APP_URL"));
if (
  !/^https?:$/.test(authUrl.protocol) ||
  !/^https?:$/.test(publicUrl.protocol)
) {
  throw new Error(
    "BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must use HTTP or HTTPS",
  );
}
if (authUrl.origin !== publicUrl.origin) {
  throw new Error(
    "BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must share the same origin",
  );
}

const client = postgres(databaseUrl, { max: 1, prepare: false });
let migrationLockAcquired = false;

try {
  await client`select pg_advisory_lock(${migrationLockClass}, ${migrationLockId})`;
  migrationLockAcquired = true;
  await migrate(drizzle(client), {
    migrationsFolder: resolve(process.cwd(), "server/database/migrations"),
  });
  console.info("Production database migrations are current.");
} catch (error) {
  console.error("Production database migration failed.", error);
  process.exitCode = 1;
} finally {
  try {
    if (migrationLockAcquired) {
      await client`select pg_advisory_unlock(${migrationLockClass}, ${migrationLockId})`;
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}
