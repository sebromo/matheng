import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const worksheetPermission = pgEnum("worksheet_permission", [
  "editor",
  "viewer",
]);

export const worksheets = pgTable(
  "worksheets",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    revision: integer("revision").notNull().default(1),
    content: jsonb("content").$type<unknown>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("worksheets_owner_updated_idx").on(table.ownerId, table.updatedAt),
  ],
);

export const worksheetRevisions = pgTable(
  "worksheet_revisions",
  {
    id: text("id").primaryKey(),
    worksheetId: text("worksheet_id")
      .notNull()
      .references(() => worksheets.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    content: jsonb("content").$type<unknown>().notNull(),
    schemaVersion: integer("schema_version").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestId: text("request_id"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("worksheet_revisions_number_uidx").on(
      table.worksheetId,
      table.revisionNumber,
    ),
    uniqueIndex("worksheet_revisions_request_uidx").on(
      table.worksheetId,
      table.requestId,
    ),
    index("worksheet_revisions_created_idx").on(
      table.worksheetId,
      table.createdAt,
    ),
  ],
);

export const worksheetPermissions = pgTable(
  "worksheet_permissions",
  {
    worksheetId: text("worksheet_id")
      .notNull()
      .references(() => worksheets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: worksheetPermission("permission").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.worksheetId, table.userId] }),
    index("worksheet_permissions_user_idx").on(table.userId),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    action: text("action").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_resource_created_idx").on(
      table.resourceType,
      table.resourceId,
      table.createdAt,
    ),
  ],
);

export const worksheetRelations = relations(worksheets, ({ many, one }) => ({
  owner: one(users, { fields: [worksheets.ownerId], references: [users.id] }),
  revisions: many(worksheetRevisions),
  permissions: many(worksheetPermissions),
}));

export const worksheetRevisionRelations = relations(
  worksheetRevisions,
  ({ one }) => ({
    worksheet: one(worksheets, {
      fields: [worksheetRevisions.worksheetId],
      references: [worksheets.id],
    }),
    author: one(users, {
      fields: [worksheetRevisions.createdBy],
      references: [users.id],
    }),
  }),
);

export const worksheetPermissionRelations = relations(
  worksheetPermissions,
  ({ one }) => ({
    worksheet: one(worksheets, {
      fields: [worksheetPermissions.worksheetId],
      references: [worksheets.id],
    }),
    user: one(users, {
      fields: [worksheetPermissions.userId],
      references: [users.id],
    }),
  }),
);

export const schema = {
  users,
  sessions,
  accounts,
  verifications,
  worksheets,
  worksheetRevisions,
  worksheetPermissions,
  auditEvents,
};
