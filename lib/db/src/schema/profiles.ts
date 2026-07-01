import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  branchId: text("branch_id"),
  totpEnabled: boolean("totp_enabled").notNull(),
  totpSecret: text("totp_secret"),
  totpBackupCodes: text("totp_backup_codes"),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
