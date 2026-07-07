import {
  pgTable, text, boolean, timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// id is the Supabase auth user ID (mirrors auth.users.id)
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  branchId: text("branch_id"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  totpSecret: text("totp_secret"),
  totpBackupCodes: text("totp_backup_codes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("uq_profiles_email").on(t.email),
]);
