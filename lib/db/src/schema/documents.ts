/**
 * Document Types — master konfigurasi jenis dokumen jemaah
 * Admin dapat menambah, mengubah, menonaktifkan, dan mengurutkan tipe dokumen
 * yang harus/boleh dilengkapi jemaah.
 */
import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const documentTypes = pgTable("document_types", {
  id: text("id").primaryKey(),
  /** Kode unik singkat, e.g. "paspor", "ktp", "foto" */
  code: text("code").notNull().unique(),
  /** Label tampil ke user */
  label: text("label").notNull(),
  /** Panduan singkat untuk jemaah */
  description: text("description"),
  /** Wajib atau opsional */
  isRequired: boolean("is_required").notNull().default(true),
  /**
   * Siapa yang memerlukan dokumen ini:
   * "all" | "adult" | "child" | "infant" | "married" | "male" | "female"
   */
  appliesTo: text("applies_to").notNull().default("all"),
  /** Format file yang diterima, comma-separated: "pdf,jpg,png" */
  allowedFormats: text("allowed_formats").notNull().default("pdf,jpg,png"),
  /** Batas ukuran file dalam MB */
  maxSizeMb: integer("max_size_mb").notNull().default(5),
  /** Apakah perlu diverifikasi admin setelah upload */
  needsVerification: boolean("needs_verification").notNull().default(true),
  /** Apakah dokumen ini punya tanggal kadaluarsa (paspor, visa, KTP) */
  hasExpiry: boolean("has_expiry").notNull().default(false),
  /** Aktif/nonaktif — nonaktif tidak muncul di checklist jemaah */
  isActive: boolean("is_active").notNull().default(true),
  /** Urutan tampil di UI */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type DocumentType = typeof documentTypes.$inferSelect;
export type NewDocumentType = typeof documentTypes.$inferInsert;
