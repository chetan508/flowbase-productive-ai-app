CREATE TABLE "generated_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"app_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'Sparkles' NOT NULL,
	"color" text DEFAULT '#8b5cf6' NOT NULL,
	"layout" text DEFAULT 'single-page' NOT NULL,
	"template" jsonb NOT NULL,
	"added_to_sidebar" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_apps" ADD CONSTRAINT "generated_apps_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;