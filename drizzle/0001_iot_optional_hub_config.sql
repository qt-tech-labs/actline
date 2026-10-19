CREATE TYPE "public"."hub_command_kind" AS ENUM('valve_test');--> statement-breakpoint
CREATE TYPE "public"."hub_command_status" AS ENUM('queued', 'sent', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "hub_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid NOT NULL,
	"kind" "hub_command_kind" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "hub_command_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hubs" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "iot_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hub_commands" ADD CONSTRAINT "hub_commands_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hub_commands_hub_idx" ON "hub_commands" USING btree ("hub_id","status");