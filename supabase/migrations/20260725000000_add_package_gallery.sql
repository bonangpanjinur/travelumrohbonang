-- Migration: add package_gallery table
-- package_gallery was defined in the Drizzle schema but never pushed to the DB.

CREATE TABLE IF NOT EXISTS "package_gallery" (
  "id" text PRIMARY KEY NOT NULL,
  "package_id" text NOT NULL,
  "image_url" text NOT NULL,
  "caption" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone
);

-- Foreign key to packages (cascade delete)
DO $$ BEGIN
  ALTER TABLE "package_gallery"
    ADD CONSTRAINT "package_gallery_package_id_packages_id_fk"
    FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_package_gallery_package_id"
  ON "package_gallery" USING btree ("package_id");
