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
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;