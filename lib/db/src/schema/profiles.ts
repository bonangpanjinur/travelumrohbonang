import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  branchId: text("branch_id"),
  totpEnabled: boolean("totp_enabled").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
});
