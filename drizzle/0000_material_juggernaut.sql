CREATE TYPE "public"."day_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TYPE "public"."device_kind" AS ENUM('gateway', 'soil_probe', 'valve', 'camera');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('ok', 'warning', 'offline');--> statement-breakpoint
CREATE TYPE "public"."insight_kind" AS ENUM('camera', 'day');--> statement-breakpoint
CREATE TYPE "public"."milestone_kind" AS ENUM('standard', 'shopping', 'target');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'paused', 'done');--> statement-breakpoint
CREATE TYPE "public"."sensor_metric" AS ENUM('air_temperature', 'air_humidity', 'soil_moisture', 'substrate_ph', 'light_intensity');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('todo', 'doing', 'done');--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "insight_kind" NOT NULL,
	"day" integer,
	"body" text NOT NULL,
	"confidence_pct" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"condition" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"golden_start" time,
	"golden_end" time,
	"status" "day_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "day_plans_project_day_uq" UNIQUE("project_id","day")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hub_id" uuid NOT NULL,
	"kind" "device_kind" NOT NULL,
	"name" text NOT NULL,
	"status" "device_status" DEFAULT 'ok' NOT NULL,
	"display_value" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"label" text NOT NULL,
	"amount_vnd" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"battery_pct" integer,
	"online" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "hubs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"severity" "severity" DEFAULT 'medium' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"label" text NOT NULL,
	"title" text NOT NULL,
	"icon" text,
	"kind" "milestone_kind" DEFAULT 'standard' NOT NULL,
	"is_minor" boolean DEFAULT false NOT NULL,
	CONSTRAINT "milestones_project_day_uq" UNIQUE("project_id","day")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_day" integer NOT NULL,
	"end_day" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'psychiatry' NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"budget_vnd" integer DEFAULT 0 NOT NULL,
	"expected_revenue_vnd" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_readings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"metric" "sensor_metric" NOT NULL,
	"value" double precision NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_targets" (
	"project_id" uuid NOT NULL,
	"metric" "sensor_metric" NOT NULL,
	"min" double precision NOT NULL,
	"max" double precision NOT NULL,
	CONSTRAINT "sensor_targets_project_id_metric_pk" PRIMARY KEY("project_id","metric")
);
--> statement-breakpoint
CREATE TABLE "step_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"url" text NOT NULL,
	"filename" text NOT NULL,
	"is_proof" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_plan_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"estimated_minutes" integer,
	"status" "step_status" DEFAULT 'todo' NOT NULL,
	"completed_at" timestamp with time zone,
	"clip_seconds" integer,
	"has_camera_shortcut" boolean DEFAULT false NOT NULL,
	"requires_photo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "steps_plan_position_uq" UNIQUE("day_plan_id","position")
);
--> statement-breakpoint
CREATE TABLE "supplies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"quantity" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_plans" ADD CONSTRAINT "day_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_hub_id_hubs_id_fk" FOREIGN KEY ("hub_id") REFERENCES "public"."hubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_targets" ADD CONSTRAINT "sensor_targets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_items" ADD CONSTRAINT "step_items_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_photos" ADD CONSTRAINT "step_photos_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_day_plan_id_day_plans_id_fk" FOREIGN KEY ("day_plan_id") REFERENCES "public"."day_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_day_plan_id_day_plans_id_fk" FOREIGN KEY ("day_plan_id") REFERENCES "public"."day_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insights_project_kind_idx" ON "ai_insights" USING btree ("project_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "rules_project_idx" ON "automation_rules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "devices_hub_idx" ON "devices" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX "expenses_project_idx" ON "expenses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "incidents_project_idx" ON "incidents" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "notes_project_day_idx" ON "notes" USING btree ("project_id","day");--> statement-breakpoint
CREATE INDEX "stages_project_idx" ON "project_stages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "readings_project_metric_time_idx" ON "sensor_readings" USING btree ("project_id","metric","recorded_at");--> statement-breakpoint
CREATE INDEX "step_items_step_idx" ON "step_items" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "step_photos_step_idx" ON "step_photos" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "supplies_plan_idx" ON "supplies" USING btree ("day_plan_id");