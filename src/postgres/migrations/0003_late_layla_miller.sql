CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY DEFAULT gen_secure_token() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"rp_name" text NOT NULL,
	"rp_id" text NOT NULL,
	"webauthn_user_id" text NOT NULL,
	"webauthn_user_name" text NOT NULL,
	"webauthn_user_display_name" text NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"algorithm" smallint NOT NULL,
	"transports" jsonb NOT NULL,
	"wrapped_dek" text NOT NULL,
	"kek_salt" text NOT NULL,
	CONSTRAINT "passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;