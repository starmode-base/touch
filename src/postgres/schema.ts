/**
 * Postgres schema
 *
 * NOTE: It is important to make shared field helpers function as they are
 * mutated by the ORM (particularly the inferred field name).
 *
 * In other words, you can't use the same helper for two different fields in
 * the same table unless the helper is a function.
 *
 * Eg. bad:
 * ```ts
 * const decimal2 = numeric({ scale: 2, precision: 18, mode: "number" });
 * ```
 *
 * Good:
 * ```ts
 * const decimal2 = () => numeric({ scale: 2, precision: 18, mode: "number" });
 * ```
 */
import {
  boolean,
  check,
  date,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  foreignKey,
  uniqueIndex,
  index,
  text,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Primary key */
const primaryKeyField = () =>
  text()
    .primaryKey()
    .default(sql`gen_secure_token()`);

/** Timestamp with default NOW() */
const timestampField = () =>
  timestamp({ mode: "string" }).defaultNow().notNull();

/** Decimal type with 2 decimal places */
export const decimal2Field = () =>
  numeric({ scale: 2, precision: 18, mode: "number" });

/** Base schema for most tables */
const baseSchema = {
  id: primaryKeyField(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
};

/**
 * Workspace member role enum
 */
export const workspaceMemberRole = pgEnum("workspace_member_role", [
  /** Workspace administrator */
  "administrator",
  /** Workspace member */
  "member",
]);

export type WorkspaceMemberRole =
  (typeof workspaceMemberRole.enumValues)[number];

/**
 * Users table
 */
export const users = pgTable("users", {
  ...baseSchema,
  email: text().notNull(),
  clerkUserId: text().notNull().unique(),
  isSuperuser: boolean().notNull().default(false),
});

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

/**
 * Workspaces table
 */
export const workspaces = pgTable("workspaces", {
  ...baseSchema,
  name: text().notNull(),
});

export type WorkspaceSelect = typeof workspaces.$inferSelect;
export type WorkspaceInsert = typeof workspaces.$inferInsert;

/**
 * Workspace memberships junction table
 */
export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    workspaceId: text()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestampField(),
    updatedAt: timestampField(),
    role: workspaceMemberRole().notNull(),
  },
  (t) => [
    // Enforce: a user can only be a member of a workspace once
    primaryKey({ columns: [t.workspaceId, t.userId] }),
  ],
);

export type WorkspaceMembershipSelect =
  typeof workspaceMemberships.$inferSelect;
export type WorkspaceMembershipInsert =
  typeof workspaceMemberships.$inferInsert;

/**
 * Contacts table
 *
 * AKA: People
 */
export const contacts = pgTable(
  "contacts",
  {
    ...baseSchema,
    workspaceId: text()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    name: text().notNull(),
    linkedin: text(),
  },
  (t) => [
    // Enforce: LinkedIn is unique per workspace (NULLs allowed; duplicates only
    // blocked when present)
    unique().on(t.workspaceId, t.linkedin),

    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.id, t.workspaceId),
  ],
);

export type ContactSelect = typeof contacts.$inferSelect;
export type ContactInsert = typeof contacts.$inferInsert;

/**
 * Contact activities table
 */
export const contactActivities = pgTable(
  "contact_activities",
  {
    ...baseSchema,
    workspaceId: text()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    contactId: text().notNull(),
    createdById: text().notNull(),
    happenedAt: date({ mode: "string" }).defaultNow().notNull(),
    kind: text()
      .$type<
        // A touch with the contact (call, email, etc.), used for contact's last
        // touch date.
        | "user:touch"
        // A user note about the contact
        | "user:note"
        // System activities so users can see who created/updated contacts
        | "system:contact_created" // body=name, linkedin
        | "system:contact_updated" // body=new name, new linkedin
      >()
      .notNull(),
    // Human-readable description of the activity, used for all kinds
    body: text().notNull(),
    // Only for kind:'system:*'
    details: jsonb().$type<{ name?: string; linkedin?: string }>(),
  },
  (t) => [
    // FK constraint: Actor must belong to this workspace
    foreignKey({
      columns: [t.workspaceId, t.createdById],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.userId,
      ],
    }).onDelete("cascade"),

    // FK constraint: Contact must belong to this workspace
    foreignKey({
      columns: [t.workspaceId, t.contactId],
      foreignColumns: [contacts.workspaceId, contacts.id],
    }).onDelete("cascade"),

    // Performance indexes for composite FKs
    index().on(t.workspaceId, t.createdById),
    index().on(t.workspaceId, t.contactId),

    // Check constraint: details required for system:* kinds, and must be NULL
    // for user:* kinds
    check(
      "details_required_for_system_contact",
      sql`(${t.kind} LIKE 'system:%' AND ${t.details} IS NOT NULL) OR (${t.kind} NOT LIKE 'system:%' AND ${t.details} IS NULL)`,
    ),
  ],
);

/** Opportunity status enum */
export const opportunityStatus = pgEnum("opportunity_status", [
  "open",
  "won",
  "lost",
]);
export type OpportunityStatus = (typeof opportunityStatus.enumValues)[number];

/**
 * Opportunities table
 *
 * AKA: Deals, Threads
 */
export const opportunities = pgTable(
  "opportunities",
  {
    ...baseSchema,
    workspaceId: text()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    name: text().notNull(),
    status: opportunityStatus().notNull(),
  },
  (t) => [
    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.id, t.workspaceId),
  ],
);

/**
 * Opportunity contacts junction table
 *
 * Enables many-to-many relationships between opportunities and contacts
 */
export const opportunityContacts = pgTable(
  "opportunity_contacts",
  {
    workspaceId: text()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    opportunityId: text().notNull(),
    contactId: text().notNull(),
    createdAt: timestampField(),
    updatedAt: timestampField(),
    // Maybe:
    // closedAt: timestamp({ mode: "string" }),
  },
  (t) => [
    // Enforce: a contact can only be linked to an opportunity once
    primaryKey({ columns: [t.opportunityId, t.contactId] }),

    // FK constraint: Contact must belong to this workspace
    foreignKey({
      columns: [t.workspaceId, t.contactId],
      foreignColumns: [contacts.workspaceId, contacts.id],
    }).onDelete("cascade"),

    // FK constraint: Opportunity must belong to this workspace
    foreignKey({
      columns: [t.workspaceId, t.opportunityId],
      foreignColumns: [opportunities.workspaceId, opportunities.id],
    }).onDelete("cascade"),

    // Performance indexes for composite FKs
    index().on(t.workspaceId, t.contactId),
    index().on(t.workspaceId, t.opportunityId),
  ],
);

export type OpportunityContactSelect = typeof opportunityContacts.$inferSelect;
export type OpportunityContactInsert = typeof opportunityContacts.$inferInsert;

/**
 * Opportunity activities table
 */
export const opportunityActivities = pgTable(
  "opportunity_activities",
  {
    ...baseSchema,
    workspaceId: text()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    opportunityId: text().notNull(),
    createdById: text().notNull(),
    happenedAt: date({ mode: "string" }).defaultNow().notNull(),
    kind: text()
      .$type<
        // A user note about the opportunity
        | "user:note"
        // Next activity to do to advance the opportunity, has a due date
        | "user:next_step"
        // System activities so users can see who created/updated opportunities
        | "system:opportunity_created" // body=name, status
        | "system:opportunity_updated" // body=new name, new status
      >()
      .notNull(),
    // Human-readable description of the activity, used for all kinds
    body: text().notNull(),
    // Only for kind:'system:*'
    details: jsonb().$type<{ name?: string; status?: OpportunityStatus }>(),
    // Only for kind='user:next_step': when the next step is due
    dueAt: date({ mode: "string" }),
    // Only for kind='user:next_step': when the next step was closed
    closedAt: timestamp({ mode: "string" }),
  },
  (t) => [
    // FK constraint: Actor must belong to this workspace
    foreignKey({
      columns: [t.workspaceId, t.createdById],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.userId,
      ],
    }).onDelete("cascade"),

    // FK constraint: Opportunity must belong to this workspace
    foreignKey({
      columns: [t.workspaceId, t.opportunityId],
      foreignColumns: [opportunities.workspaceId, opportunities.id],
    }).onDelete("cascade"),

    // Performance indexes for composite FKs
    index().on(t.workspaceId, t.opportunityId),
    index().on(t.workspaceId, t.createdById),

    // Enforce: at most one open next step per opportunity
    uniqueIndex()
      .on(t.opportunityId)
      .where(sql`${t.kind} = 'user:next_step' AND ${t.closedAt} IS NULL`),

    // Check constraint: dueAt _must_ be set when kind is 'user:next_step', and
    // must be null for all other kinds
    check(
      "due_at_only_for_next_step",
      sql`(${t.kind} = 'user:next_step' AND ${t.dueAt} IS NOT NULL) OR (${t.kind} != 'user:next_step' AND ${t.dueAt} IS NULL)`,
    ),

    // Check constraint: closedAt _may_ only be set for 'user:next_step', and it
    // must be null for all other kinds
    check(
      "closed_at_only_for_next_step",
      sql`(${t.kind} = 'user:next_step') OR (${t.closedAt} IS NULL)`,
    ),

    // Check constraint: details required for system:* kinds, and must be NULL
    // for user:* kinds
    check(
      "details_required_for_system_opportunity",
      sql`(${t.kind} LIKE 'system:%' AND ${t.details} IS NOT NULL) OR (${t.kind} NOT LIKE 'system:%' AND ${t.details} IS NULL)`,
    ),
  ],
);
