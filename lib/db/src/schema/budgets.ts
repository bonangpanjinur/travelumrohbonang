/**
 * F-12: Budget & Proyeksi Cash Flow
 * Tabel anggaran per periode (tahunan / bulanan) dan kategori
 */

import {
  pgTable, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";

// Kategori budget — selaras dengan kategori package_costs dan financial_transactions
export const BUDGET_CATEGORIES = [
  "pendapatan_umroh",
  "pendapatan_lainnya",
  "biaya_hotel",
  "biaya_penerbangan",
  "biaya_visa",
  "biaya_transportasi",
  "biaya_konsumsi",
  "biaya_perlengkapan",
  "biaya_muthawif",
  "biaya_operasional",
  "biaya_pemasaran",
  "biaya_administrasi",
  "lainnya",
] as const;

export const budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  periodYear: integer("period_year").notNull(),           // tahun anggaran, mis: 2026
  periodMonth: integer("period_month"),                   // bulan 1-12, null = anggaran tahunan
  category: text("category").notNull(),                  // lihat BUDGET_CATEGORIES
  categoryLabel: text("category_label"),                 // nama tampilan bebas
  budgetType: text("budget_type").notNull().default("expense"), // income | expense
  amount: integer("amount").notNull().default(0),        // target anggaran (IDR)
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  index("idx_budgets_year").on(t.periodYear),
  index("idx_budgets_year_month").on(t.periodYear, t.periodMonth),
  index("idx_budgets_category").on(t.category),
]);
