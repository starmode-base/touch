ALTER TABLE "contact_activities" DROP CONSTRAINT "contact_activities_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_activities" DROP CONSTRAINT "contact_activities_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_activities" DROP CONSTRAINT "contact_activities_contact_id_workspace_id_contacts_id_workspace_id_fk";
--> statement-breakpoint
ALTER TABLE "opportunity_activities" DROP CONSTRAINT "opportunity_activities_opportunity_id_opportunities_id_fk";
--> statement-breakpoint
ALTER TABLE "opportunity_activities" DROP CONSTRAINT "opportunity_activities_created_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "opportunity_activities" DROP CONSTRAINT "opportunity_activities_opportunity_id_workspace_id_opportunities_id_workspace_id_fk";
--> statement-breakpoint
ALTER TABLE "opportunity_contacts" DROP CONSTRAINT "opportunity_contacts_opportunity_id_opportunities_id_fk";
--> statement-breakpoint
ALTER TABLE "opportunity_contacts" DROP CONSTRAINT "opportunity_contacts_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "opportunity_contacts" DROP CONSTRAINT "opportunity_contacts_contact_id_workspace_id_contacts_id_workspace_id_fk";
--> statement-breakpoint
ALTER TABLE "opportunity_contacts" DROP CONSTRAINT "opportunity_contacts_opportunity_id_workspace_id_opportunities_id_workspace_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_workspace_id_contact_id_contacts_workspace_id_id_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_workspace_id_opportunity_id_opportunities_workspace_id_id_fk" FOREIGN KEY ("workspace_id","opportunity_id") REFERENCES "public"."opportunities"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_workspace_id_contact_id_contacts_workspace_id_id_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_workspace_id_opportunity_id_opportunities_workspace_id_id_fk" FOREIGN KEY ("workspace_id","opportunity_id") REFERENCES "public"."opportunities"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_activities_workspace_id_created_by_id_index" ON "contact_activities" USING btree ("workspace_id","created_by_id");--> statement-breakpoint
CREATE INDEX "contact_activities_workspace_id_contact_id_index" ON "contact_activities" USING btree ("workspace_id","contact_id");--> statement-breakpoint
CREATE INDEX "opportunity_activities_workspace_id_opportunity_id_index" ON "opportunity_activities" USING btree ("workspace_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_activities_workspace_id_created_by_id_index" ON "opportunity_activities" USING btree ("workspace_id","created_by_id");--> statement-breakpoint
CREATE INDEX "opportunity_contacts_workspace_id_contact_id_index" ON "opportunity_contacts" USING btree ("workspace_id","contact_id");--> statement-breakpoint
CREATE INDEX "opportunity_contacts_workspace_id_opportunity_id_index" ON "opportunity_contacts" USING btree ("workspace_id","opportunity_id");