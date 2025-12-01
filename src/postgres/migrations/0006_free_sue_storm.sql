ALTER TABLE "accounts" ALTER COLUMN "id" SET DEFAULT gen_secure_token();--> statement-breakpoint
ALTER TABLE "otps" ALTER COLUMN "id" SET DEFAULT gen_secure_token();--> statement-breakpoint
ALTER TABLE "otps" ALTER COLUMN "updated_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DEFAULT gen_secure_token();