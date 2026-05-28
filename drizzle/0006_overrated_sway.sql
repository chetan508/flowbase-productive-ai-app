CREATE TABLE "user_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"scope" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"icon" text DEFAULT 'Tag' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"theme" text DEFAULT 'system' NOT NULL,
	"default_calendar_view" text DEFAULT 'month' NOT NULL,
	"default_task_priority" text DEFAULT 'Medium' NOT NULL,
	"auto_save" integer DEFAULT 1 NOT NULL,
	"ai_settings" jsonb NOT NULL,
	"notification_settings" jsonb NOT NULL,
	"privacy_settings" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_unique" ON "user_settings" USING btree ("user_id");