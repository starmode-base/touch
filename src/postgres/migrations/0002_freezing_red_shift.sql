ALTER TABLE "passkeys" ADD COLUMN "rp_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "rp_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "webauthn_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "webauthn_user_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "webauthn_user_display_name" text NOT NULL;