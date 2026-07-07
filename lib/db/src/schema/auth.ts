import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// ─── NOTE ──────────────────────────────────────────────────────────────────────
// This app uses Supabase Auth — NOT Replit Auth.
//
// The two tables below (`sessions`, `users`) exist in the local Postgres DB
// because the project was originally scaffolded on top of a Replit Auth template.
// They are kept in the Drizzle schema to prevent `drizzle-kit push` from
// dropping them (other code may still reference them), but they play NO ROLE
// in authentication.  The app's auth source of truth is:
//   • Identity   → Supabase Auth (auth.users)
//   • Profile    → public.profiles (see profiles.ts)
//   • Roles      → public.user_roles (see agents.ts)
//
// Do NOT use usersTable or sessionsTable in new code.
// ──────────────────────────────────────────────────────────────────────────────

/** @deprecated — Replit Auth scaffold remnant. Not used by this app. */
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

/** @deprecated — Replit Auth scaffold remnant. Not used by this app. Use profiles.ts instead. */
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
