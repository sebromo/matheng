import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/database/schema.ts",
  out: "./server/database/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? "postgres://forma:forma@localhost:5432/forma",
  },
  strict: true,
  verbose: true,
});
