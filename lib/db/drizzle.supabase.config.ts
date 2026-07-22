/**
 * Drizzle config khusus untuk push schema ke Supabase production.
 *
 * Gunakan:
 *   cd lib/db && pnpm drizzle-kit push --config=drizzle.supabase.config.ts
 *
 * Butuh env: SUPABASE_DB_URL (PostgreSQL direct connection string dari
 * Supabase Dashboard → Project Settings → Database → Connection string → URI)
 */
import { defineConfig } from "drizzle-kit";
import path from "path";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  throw new Error(
    "SUPABASE_DB_URL tidak di-set. Isi dengan PostgreSQL direct URL dari " +
    "Supabase Dashboard → Project Settings → Database → Connection string → URI"
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "../../supabase/migrations"),
  dialect: "postgresql",
  dbCredentials: { url },
});
