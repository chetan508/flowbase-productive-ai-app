CREATE TABLE "calendar_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"category_key" text,
	"scheduled_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_items" ADD CONSTRAINT "calendar_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;