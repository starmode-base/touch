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
  smallint,
  index,
  boolean,
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
  created_at: timestampField(),
  updated_at: timestampField(),
};

/**
 * Users table
 */
export const users = pgTable("users", {
  id: primaryKeyField(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" })
    .defaultNow()
    .$onUpdate(() => sql`now()`)
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: primaryKeyField(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .$onUpdate(() => sql`now()`)
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: primaryKeyField(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      mode: "string",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      mode: "string",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const otps = pgTable(
  "otps",
  {
    id: primaryKeyField(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [index("otps_identifier_idx").on(table.identifier)],
);

/**
 * User passkeys table for E2EE
 *
 * Stores PRF-enabled passkeys used for deriving encryption keys.
 * Public keys are stored for future authentication use (Option 2) but not used
 * yet in Option 1 where Clerk handles authentication.
 */
export const passkeys = pgTable("passkeys", {
  ...baseSchema,
  /** Owner - who owns this passkey */
  user_id: text()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  /**
   * WebAuthn relying party (RP) context - where this passkey was created
   */

  /** WebAuthn RP name */
  rp_name: text().notNull(),
  /** WebAuthn RP ID (e.g., "localhost", "touch.example.com") */
  rp_id: text().notNull(),

  /**
   * WebAuthn user context - what user identity was used
   */

  /** WebAuthn user.id (base64url-encoded random bytes) */
  webauthn_user_id: text().notNull(),
  /** WebAuthn user.name */
  webauthn_user_name: text().notNull(),
  /** WebAuthn user.displayName */
  webauthn_user_display_name: text().notNull(),

  /**
   * WebAuthn credential outputs - what the authenticator gave us
   */

  /** WebAuthn credential ID (base64url-encoded, globally unique) */
  credential_id: text().notNull().unique(),
  /** Base64url-encoded public key (for future authentication) */
  public_key: text().notNull(),
  /** Algorithm used (e.g., -7 for ES256) */
  algorithm: smallint().notNull(),
  /** Transports for UX optimization (e.g., ["internal", "hybrid"]) */
  transports: jsonb().$type<string[]>().notNull(),

  /**
   *  E2EE data - our app-specific encryption
   */

  /** Base64url-encoded DEK wrapped by this passkey's KEK */
  wrapped_dek: text().notNull(),
  /** Base64url-encoded salt for deriving KEK from PRF output */
  kek_salt: text().notNull(),
});

/**
 * Contacts table (AKA people)
 */
export const contacts = pgTable(
  "contacts",
  {
    ...baseSchema,
    user_id: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text().notNull(),
    linkedin: text(),
  },
  (t) => [
    // Enforce: LinkedIn is unique per user (NULLs allowed; duplicates only
    // blocked when present)
    unique().on(t.user_id, t.linkedin),

    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.user_id, t.id),
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
    user_id: text()
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
    unique().on(t.user_id, t.key),

    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.user_id, t.id),
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
    user_id: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    contact_id: text().notNull(),
    contact_role_id: text().notNull(),
    created_at: timestampField(),
    updated_at: timestampField(),
  },
  (t) => [
    // Enforce: a contact can only have a specific role once
    primaryKey({ columns: [t.user_id, t.contact_id, t.contact_role_id] }),

    // FK constraint: Contact must belong to this user
    foreignKey({
      columns: [t.user_id, t.contact_id],
      foreignColumns: [contacts.user_id, contacts.id],
    }).onDelete("cascade"),

    // FK constraint: Role must belong to this user
    foreignKey({
      columns: [t.user_id, t.contact_role_id],
      foreignColumns: [contactRoles.user_id, contactRoles.id],
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
    user_id: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    contact_id: text().notNull(),
    happened_at: date({ mode: "string" }).defaultNow().notNull(),
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
      columns: [t.user_id, t.contact_id],
      foreignColumns: [contacts.user_id, contacts.id],
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
    user_id: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text().notNull(),
    status: opportunityStatus().notNull(),
  },
  (t) => [
    // FK support: Unique constraint to support composite foreign keys from
    // other tables
    unique().on(t.user_id, t.id),
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
    user_id: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    opportunity_id: text().notNull(),
    contact_id: text().notNull(),
    created_at: timestampField(),
    updated_at: timestampField(),
  },
  (t) => [
    // Enforce: a contact can only be linked to an opportunity once
    primaryKey({ columns: [t.user_id, t.opportunity_id, t.contact_id] }),

    // FK constraint: Contact must belong to this user
    foreignKey({
      columns: [t.user_id, t.contact_id],
      foreignColumns: [contacts.user_id, contacts.id],
    }).onDelete("cascade"),

    // FK constraint: Opportunity must belong to this user
    foreignKey({
      columns: [t.user_id, t.opportunity_id],
      foreignColumns: [opportunities.user_id, opportunities.id],
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
    user_id: text()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    opportunity_id: text().notNull(),
    happened_at: date({ mode: "string" }).defaultNow().notNull(),
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
    due_at: date({ mode: "string" }),
    // Only for kind='user:next_step': when the next step was closed
    closed_at: timestamp({ mode: "string" }),
  },
  (t) => [
    // FK constraint: Opportunity must belong to this user
    foreignKey({
      columns: [t.user_id, t.opportunity_id],
      foreignColumns: [opportunities.user_id, opportunities.id],
    }).onDelete("cascade"),

    // Enforce: at most one open next step per opportunity
    uniqueIndex()
      .on(t.opportunity_id)
      .where(sql`${t.kind} = 'user:next_step' AND ${t.closed_at} IS NULL`),

    // Check constraint: dueAt _must_ be set when kind is 'user:next_step', and
    // must be null for all other kinds
    check(
      "due_at_only_for_next_step",
      sql`(${t.kind} = 'user:next_step' AND ${t.due_at} IS NOT NULL) OR (${t.kind} != 'user:next_step' AND ${t.due_at} IS NULL)`,
    ),

    // Check constraint: closedAt _may_ only be set for 'user:next_step', and it
    // must be null for all other kinds
    check(
      "closed_at_only_for_next_step",
      sql`(${t.kind} = 'user:next_step') OR (${t.closed_at} IS NULL)`,
    ),

    // Check constraint: details required for system:* kinds, and must be NULL
    // for user:* kinds
    check(
      "details_required_for_system_opportunity",
      sql`(${t.kind} LIKE 'system:%' AND ${t.details} IS NOT NULL) OR (${t.kind} NOT LIKE 'system:%' AND ${t.details} IS NULL)`,
    ),
  ],
);
