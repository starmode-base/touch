CREATE TYPE "public"."opportunity_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('administrator', 'member');--> statement-breakpoint
CREATE TABLE "contact_activities" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"happened_at" date DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"details" jsonb,
	CONSTRAINT "details_required_for_system_contact" CHECK (("contact_activities"."kind" LIKE 'system:%' AND "contact_activities"."details" IS NOT NULL) OR ("contact_activities"."kind" NOT LIKE 'system:%' AND "contact_activities"."details" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"linkedin" text,
	CONSTRAINT "contacts_workspaceId_linkedin_unique" UNIQUE("workspace_id","linkedin"),
	CONSTRAINT "contacts_id_workspaceId_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "opportunity_status" NOT NULL,
	CONSTRAINT "opportunities_id_workspaceId_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_activities" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"created_by_id" text NOT NULL,
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
CREATE TABLE "opportunity_contacts" (
	"workspace_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_contacts_opportunity_id_contact_id_pk" PRIMARY KEY("opportunity_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"is_superuser" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" "workspace_member_role" NOT NULL,
	CONSTRAINT "workspace_memberships_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_workspace_id_created_by_id_workspace_memberships_workspace_id_user_id_fk" FOREIGN KEY ("workspace_id","created_by_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_workspace_id_contact_id_contacts_workspace_id_id_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_workspace_id_created_by_id_workspace_memberships_workspace_id_user_id_fk" FOREIGN KEY ("workspace_id","created_by_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_workspace_id_opportunity_id_opportunities_workspace_id_id_fk" FOREIGN KEY ("workspace_id","opportunity_id") REFERENCES "public"."opportunities"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_workspace_id_contact_id_contacts_workspace_id_id_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_workspace_id_opportunity_id_opportunities_workspace_id_id_fk" FOREIGN KEY ("workspace_id","opportunity_id") REFERENCES "public"."opportunities"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_activities_workspace_id_created_by_id_index" ON "contact_activities" USING btree ("workspace_id","created_by_id");--> statement-breakpoint
CREATE INDEX "contact_activities_workspace_id_contact_id_index" ON "contact_activities" USING btree ("workspace_id","contact_id");--> statement-breakpoint
CREATE INDEX "opportunity_activities_workspace_id_opportunity_id_index" ON "opportunity_activities" USING btree ("workspace_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_activities_workspace_id_created_by_id_index" ON "opportunity_activities" USING btree ("workspace_id","created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_activities_opportunity_id_index" ON "opportunity_activities" USING btree ("opportunity_id") WHERE "opportunity_activities"."kind" = 'user:next_step' AND "opportunity_activities"."closed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "opportunity_contacts_workspace_id_contact_id_index" ON "opportunity_contacts" USING btree ("workspace_id","contact_id");--> statement-breakpoint
CREATE INDEX "opportunity_contacts_workspace_id_opportunity_id_index" ON "opportunity_contacts" USING btree ("workspace_id","opportunity_id");