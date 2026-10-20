CREATE TABLE "blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"total_days" integer NOT NULL,
	"daily_minutes" integer NOT NULL,
	"budget_vnd" integer NOT NULL,
	"experience" text NOT NULL,
	"iot_enabled" boolean,
	"payload" jsonb NOT NULL,
	"model" text,
	"engine" text DEFAULT 'template' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blueprints" ADD CONSTRAINT "blueprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blueprints_user_idx" ON "blueprints" USING btree ("user_id");