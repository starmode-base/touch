/**
 * Postgres Drizzle ORM schema
 *
 * Instructions: .cursor/rules/drizzle.mdc
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
  check,
  date,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  foreignKey,
  uniqueIndex,
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
 * Users table
 */
export const users = pgTable("users", {
  ...baseSchema,
  /**
   * User email address copied from Clerk's primary email
   *
   * Intentionally not unique in this table because Clerk enforces uniqueness
   * and emails can change. Cached here for display and convenience.
   */
  email: text().notNull(),
  /** Stable unique user identifier from Clerk */
  clerkUserId: text().notNull().unique(),
});

/**
 * User passkeys table for E2EE
 *
 * Stores PRF-enabled passkeys used for deriving encryption keys.
 * Public keys are stored for future authentication use (Option 2) but not used
 * yet in Option 1 where Clerk handles authentication.
 */
export const passkeys = pgTable("passkeys", {
  ...baseSchema,
  userId: text()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  /** WebAuthn credential ID (base64url-encoded, globally unique) */
  credentialId: text().notNull().unique(),
  /** Base64url-encoded public key (for future authentication) */
  publicKey: text().notNull(),
  /** Base64url-encoded DEK wrapped by this passkey's KEK */
  wrappedDek: text().notNull(),
  /** Base64url-encoded salt for deriving KEK from PRF output */
  kekSalt: text().notNull(),
  /** Transports for UX optimization (e.g., ["internal", "hybrid"]) */
  transports: jsonb().$type<string[]>().notNull(),
  /** Algorithm used (e.g., -7 for ES256) */
  algorithm: text().notNull(),
});

/**
 * Contacts table (AKA people)
 */
export const contacts = pgTable(
  "contacts",
  {
    ...baseSchema,
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text().notNull(),
    linkedin: text(),
  },
  (t) => [
    // Enforce: LinkedIn is unique per user (NULLs allowed; duplicates only
    // blocked when present)
    unique().on(t.userId, t.linkedin),

    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.userId, t.id),
  ],
);

/**
 * Contact roles table
 *
 * Configurable roles that can be assigned to contacts
 */
export const contactRoles = pgTable(
  "contact_roles",
  {
    ...baseSchema,
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Ex: "inner_circle", "peer", "etc."
    key: text().notNull(),
    // Ex: "Inner circle", "Peer"
    name: text().notNull(),
    // Qualifier for the role (who can have this role assigned to them), used
    // for display
    qualifier: text().notNull(),
  },
  (t) => [
    // Enforce: Role name is unique per user
    unique().on(t.userId, t.key),

    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.userId, t.id),
  ],
);

/**
 * Contact role assignments junction table
 *
 * Enables many-to-many relationships between contacts and contact roles
 */
export const contactRoleAssignments = pgTable(
  "contact_role_assignments",
  {
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    contactId: text().notNull(),
    contactRoleId: text().notNull(),
    createdAt: timestampField(),
    updatedAt: timestampField(),
  },
  (t) => [
    // Enforce: a contact can only have a specific role once
    primaryKey({ columns: [t.userId, t.contactId, t.contactRoleId] }),

    // FK constraint: Contact must belong to this user
    foreignKey({
      columns: [t.userId, t.contactId],
      foreignColumns: [contacts.userId, contacts.id],
    }).onDelete("cascade"),

    // FK constraint: Role must belong to this user
    foreignKey({
      columns: [t.userId, t.contactRoleId],
      foreignColumns: [contactRoles.userId, contactRoles.id],
    }).onDelete("cascade"),
  ],
);

/**
 * Contact activities table
 */
export const contactActivities = pgTable(
  "contact_activities",
  {
    ...baseSchema,
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    contactId: text().notNull(),
    happenedAt: date({ mode: "string" }).defaultNow().notNull(),
    kind: text()
      .$type<
        // A touch with the contact (call, email, etc.), used for contact's last
        // touch date.
        | "user:touch"
        // A user note about the contact, does not update the contact's last
        // touch date
        | "user:note"
        // System activities so users can see who created/updated contacts
        | "system:created" // body=name, linkedin
        | "system:updated" // body=new name, new linkedin
      >()
      .notNull(),
    // Human-readable description of the activity, used for all kinds
    body: text().notNull(),
    // Only for kind:'system:*'
    details: jsonb().$type<{ name: string; linkedin: string | null }>(),
  },
  (t) => [
    // FK constraint: Contact must belong to this user
    foreignKey({
      columns: [t.userId, t.contactId],
      foreignColumns: [contacts.userId, contacts.id],
    }).onDelete("cascade"),

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
type OpportunityStatus = (typeof opportunityStatus.enumValues)[number];

/**
 * Opportunities table (AKA deals, threads)
 */
export const opportunities = pgTable(
  "opportunities",
  {
    ...baseSchema,
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text().notNull(),
    status: opportunityStatus().notNull(),
  },
  (t) => [
    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.userId, t.id),
  ],
);

/**
 * Opportunity contact links junction table
 *
 * Enables many-to-many relationships between opportunities and contacts
 */
export const opportunityContactLinks = pgTable(
  "opportunity_contact_links",
  {
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    opportunityId: text().notNull(),
    contactId: text().notNull(),
    createdAt: timestampField(),
    updatedAt: timestampField(),
  },
  (t) => [
    // Enforce: a contact can only be linked to an opportunity once
    primaryKey({ columns: [t.userId, t.opportunityId, t.contactId] }),

    // FK constraint: Contact must belong to this user
    foreignKey({
      columns: [t.userId, t.contactId],
      foreignColumns: [contacts.userId, contacts.id],
    }).onDelete("cascade"),

    // FK constraint: Opportunity must belong to this user
    foreignKey({
      columns: [t.userId, t.opportunityId],
      foreignColumns: [opportunities.userId, opportunities.id],
    }).onDelete("cascade"),
  ],
);

/**
 * Opportunity activities table
 */
export const opportunityActivities = pgTable(
  "opportunity_activities",
  {
    ...baseSchema,
    userId: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    opportunityId: text().notNull(),
    happenedAt: date({ mode: "string" }).defaultNow().notNull(),
    kind: text()
      .$type<
        // A user note about the opportunity
        | "user:note"
        // Next activity to do to advance the opportunity, has a due date
        | "user:next_step"
        // System activities so users can see who created/updated opportunities
        | "system:created" // body=name, status
        | "system:updated" // body=new name, new status
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
    // FK constraint: Opportunity must belong to this user
    foreignKey({
      columns: [t.userId, t.opportunityId],
      foreignColumns: [opportunities.userId, opportunities.id],
    }).onDelete("cascade"),

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
