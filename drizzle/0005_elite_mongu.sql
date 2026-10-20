CREATE TYPE "public"."expense_kind" AS ENUM('cost', 'income');--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "kind" "expense_kind" DEFAULT 'cost' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "supply_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "actual_price_vnd" integer;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "bought_day" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;