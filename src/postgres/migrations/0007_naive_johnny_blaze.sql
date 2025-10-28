CREATE TYPE "public"."opportunity_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "contact_activities" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"happened_at" date DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"details" jsonb,
	CONSTRAINT "details_required_for_system_contact" CHECK (("contact_activities"."kind" LIKE 'system:%' AND "contact_activities"."details" IS NOT NULL) OR ("contact_activities"."kind" NOT LIKE 'system:%' AND "contact_activities"."details" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "contact_role_assignments" (
	"user_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"contact_role_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_role_assignments_user_id_contact_id_contact_role_id_pk" PRIMARY KEY("user_id","contact_id","contact_role_id")
);
--> statement-breakpoint
CREATE TABLE "contact_roles" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"qualifier" text NOT NULL,
	CONSTRAINT "contact_roles_userId_key_unique" UNIQUE("user_id","key"),
	CONSTRAINT "contact_roles_userId_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"linkedin" text,
	CONSTRAINT "contacts_userId_linkedin_unique" UNIQUE("user_id","linkedin"),
	CONSTRAINT "contacts_userId_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "opportunity_status" NOT NULL,
	CONSTRAINT "opportunities_userId_id_unique" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_activities" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"happened_at" date DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"details" jsonb,
	"due_at" date,
	"closed_at" timestamp,
	CONSTRAINT "due_at_only_for_next_step" CHECK (("opportunity_activities"."kind" = 'user:next_step' AND "opportunity_activities"."due_at" IS NOT NULL) OR ("opportunity_activities"."kind" != 'user:next_step' AND "opportunity_activities"."due_at" IS NULL)),
	CONSTRAINT "closed_at_only_for_next_step" CHECK (("opportunity_activities"."kind" = 'user:next_step') OR ("opportunity_activities"."closed_at" IS NULL)),
	CONSTRAINT "details_required_for_system_opportunity" CHECK (("opportunity_activities"."kind" LIKE 'system:%' AND "opportunity_activities"."details" IS NOT NULL) OR ("opportunity_activities"."kind" NOT LIKE 'system:%' AND "opportunity_activities"."details" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "opportunity_contact_links" (
	"user_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_contact_links_user_id_opportunity_id_contact_id_pk" PRIMARY KEY("user_id","opportunity_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"wrapped_dek" text NOT NULL,
	"kek_salt" text NOT NULL,
	"transports" jsonb NOT NULL,
	"algorithm" text NOT NULL,
	CONSTRAINT "passkeys_credentialId_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_user_id_contact_id_contacts_user_id_id_fk" FOREIGN KEY ("user_id","contact_id") REFERENCES "public"."contacts"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_role_assignments" ADD CONSTRAINT "contact_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_role_assignments" ADD CONSTRAINT "contact_role_assignments_user_id_contact_id_contacts_user_id_id_fk" FOREIGN KEY ("user_id","contact_id") REFERENCES "public"."contacts"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_role_assignments" ADD CONSTRAINT "contact_role_assignments_user_id_contact_role_id_contact_roles_user_id_id_fk" FOREIGN KEY ("user_id","contact_role_id") REFERENCES "public"."contact_roles"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_user_id_opportunity_id_opportunities_user_id_id_fk" FOREIGN KEY ("user_id","opportunity_id") REFERENCES "public"."opportunities"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contact_links" ADD CONSTRAINT "opportunity_contact_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contact_links" ADD CONSTRAINT "opportunity_contact_links_user_id_contact_id_contacts_user_id_id_fk" FOREIGN KEY ("user_id","contact_id") REFERENCES "public"."contacts"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contact_links" ADD CONSTRAINT "opportunity_contact_links_user_id_opportunity_id_opportunities_user_id_id_fk" FOREIGN KEY ("user_id","opportunity_id") REFERENCES "public"."opportunities"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_activities_opportunity_id_index" ON "opportunity_activities" USING btree ("opportunity_id") WHERE "opportunity_activities"."kind" = 'user:next_step' AND "opportunity_activities"."closed_at" IS NULL;