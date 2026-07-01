# Rencana Audit Bug & Roadmap Pengembangan

## Bagian 1 — Audit Bug & Perbaikan (Batch A: Stabilisasi)

Berdasarkan review kode + memori proyek + perubahan terbaru, berikut isu yang perlu diperbaiki:

### A1. Konsistensi mata uang di seluruh UI publik
- `PackageCard` sudah pakai `useCurrency`, tapi banyak komponen lain masih hardcode `Rp` / `toLocaleString("id-ID")`:
  - `PackagesPreview`, `RelatedPackages`, `PackageDetail` (kotak harga, breakdown kamar), `Compare`, `InstallmentCalculator`, `Booking` (ringkasan), `Payment`, `MyBookings`, `Wishlist`, `StickyMobileCTA`.
- Perbaikan: ganti seluruh format harga publik & dashboard buyer ke `useCurrency().format()`. Halaman admin tetap IDR (uang nyata).

### A2. Template & tema dinamis
- `useActiveTemplate` sudah ada, tetapi:
  - Tidak ter-apply ulang saat admin mengubah setting (perlu realtime / invalidate).
  - Tidak meng-overwrite `--background`, `--foreground`, `--card`, `--border` → hasil terlihat "setengah".
- Perbaikan: subscribe `postgres_changes` pada `site_settings` kategori `appearance`, ekspansi token CSS, tambah preview live di Admin → Settings → Template.

### A3. SEO & meta dinamis
- `SEO.tsx` sudah ada, tapi banyak halaman (Blog list, Gallery, Manasik, Compare, Wishlist, Auth) belum memanggilnya → title default.
- Sitemap edge function ada, tapi `public/sitemap.xml` masih statis (kemungkinan konflik). Pilih satu sumber (rekomendasi: redirect /sitemap.xml ke edge function via `_redirects`/Vercel atau hapus statis).

### A4. Realtime chat & notifikasi
- `useNotifications` polling 60s — sebaiknya pakai Realtime channel agar bel update instan.
- Chat (`ChatBox`) belum ada indikator "sedang diketik" & unread badge per booking di admin.

### A5. Pembayaran & cicilan
- `installment_schedules` tidak otomatis dibuat saat booking dengan `payment_scheme='installment'`. Sekarang manual via admin → rentan lupa.
- Belum ada auto-mark `overdue` saat lewat `due_date` (perlu cron + status update).
- Reminder pembayaran (`payment-reminder` function) belum dijadwalkan via pg_cron.

### A6. Form & validasi
- Beberapa form admin (Hotels, Airlines, Airports, Muthawifs, Advantages) belum pakai Zod — hanya HTML required. Inkonsisten error UX.
- `Booking` page: validasi NIK 16 digit hanya warning, tidak blocking saat submit di step terakhir.

### A7. Bug UI/CSS spesifik
- `AdminSidebar` di viewport <900px sering tabrakan dengan header sticky (overflow horizontal di tabel admin tertentu meski sudah `ResponsiveTable` — Hotels & Airlines belum dibungkus).
- `Dialog` di mobile: beberapa dialog (PackageCommissions, UpgradeDialog) melebihi viewport → perlu `max-h-[90vh] overflow-y-auto`.
- Dark mode: token `--primary` di `.dark` di-set merah jenuh — tabrakan dengan `--accent` gold, kontras teks rendah pada beberapa Button outline. Perlu kalibrasi.
- `Toaster` (`sonner`) muncul di belakang Dialog overlay z-index pada beberapa halaman.

### A8. Keamanan & RLS
- Linter warnings (5 fungsi lama tanpa `search_path`) — bersihkan.
- `audit_logs` tidak punya index pada `(entity_type, created_at)` → query admin lambat saat data banyak.
- `error_logs` & `audit_logs` tidak punya retention/cleanup → akan membengkak.

### A9. Performance
- Halaman `Paket`, `Blog`, `Dashboard` admin: query tanpa pagination + tanpa `select` kolom spesifik → payload besar.
- Banyak gambar tanpa `loading="lazy"` & tanpa `width/height` → CLS tinggi.
- Bundle vendor besar (recharts, html2canvas, jspdf) di-load eager → split via `React.lazy` per halaman.

---

## Bagian 2 — Roadmap Fitur Lanjutan

### B1. Akuntansi & Profitabilitas (FITUR UTAMA YANG DIMINTA)
1. **HPP (Harga Pokok) per Paket**
   - Tabel baru `package_costs(package_id, category, item_name, unit, qty, unit_cost, currency, notes)` — kategori: tiket, hotel Mekkah, hotel Madinah, visa, transport, muthawif, makan, handling, marketing, lain-lain.
   - Computed view `package_hpp_summary` → total HPP per pax per paket per keberangkatan.
2. **Margin & Profit per Paket / Keberangkatan**
   - View `package_profitability`: revenue verified − HPP × pax terjual − komisi agen − komisi PIC = laba bersih.
   - Halaman admin **Profitabilitas**: tabel + chart per paket, drill-down per keberangkatan, export Excel.
3. **Laporan Laba Rugi (P&L)**
   - Dari `financial_transactions` + revenue terverifikasi + HPP. Range tanggal, per cabang.
4. **Cash Flow Forecast**
   - Berdasarkan installment_schedules + DP pending + due date.
5. **Budget vs Aktual** per kategori biaya.

### B2. Analytics & BI lebih dalam
- Cohort retention jamaah (repeat booking).
- Funnel: lead → quote → DP → lunas → keberangkatan.
- Heatmap sumber lead × paket × bulan.
- AI insight tambahan: rekomendasi pricing dinamis dari isi kuota & musim.

### B3. Operasional Keberangkatan
- **Manifest cetak** (PDF) lengkap: paspor, kursi pesawat, kamar hotel, kontak darurat.
- **Auto-assign kamar** berdasarkan gender + relasi keluarga.
- **Check-in QR** untuk jamaah di bandara (sudah ada `check_ins`, tambah QR + scanner mobile).
- **Tracking jadwal penerbangan real-time** via API (FlightAware/Aviationstack opsional).

### B4. CRM & Marketing
- Email/WhatsApp campaign builder (segmentasi: wishlist, leads cold, alumni).
- Template marketing dengan variabel (nama, paket, harga).
- Auto-nurture sequence (drip campaign).
- Form pendaftaran leads embeddable (script tag) untuk landing eksternal.

### B5. Buyer Experience
- **Wishlist comparison & alert harga**.
- **Live chat** dengan agent (sudah ada chat per booking → expand ke pre-sales).
- **Referral program buyer** (poin loyalty jadi diskon real).
- **PWA + push notification** untuk reminder pembayaran & info keberangkatan.
- **e-Tiket & e-Manasik mobile-first** dengan offline cache.

### B6. Konten & SEO
- Auto-generate artikel blog dari template + Lovable AI (umroh tips, destinasi).
- Schema.org: TouristTrip, Offer, AggregateRating untuk tiap paket detail.
- Multi-bahasa konten paket (sudah ada translate function → simpan cache di DB).

### B7. Multi-tenant & White-label
- Billing otomatis tenant berdasar template tier (cron generate invoice bulanan).
- Domain custom: panduan DNS + auto-verify.
- Tenant analytics dashboard mandiri.

### B8. Compliance & Trust
- KYC dokumen jamaah dengan OCR paspor (Lovable AI Vision).
- Tanda tangan kontrak dengan timestamp + hash (sudah ada, tambah audit blockchain-lite via hash chain di `contracts`).
- GDPR/PDPK: ekspor & hapus data jamaah (sudah ada `export-user-data`, tambah `delete-user-data`).

---

## Bagian 3 — Prioritas Eksekusi (Saran Batch)

| Batch | Fokus | Estimasi Dampak |
|---|---|---|
| **1** | A1 (currency global) + A2 (template realtime + token lengkap) + A7 (bug UI mobile) | Stabilitas tampilan |
| **2** | B1.1 + B1.2 — **HPP & Profitabilitas per Paket** (yang diminta user) | Bisnis intelligence |
| **3** | A5 (installment auto + cron reminder) + A8 (RLS warning + index + retention) | Reliabilitas operasi |
| **4** | B1.3-5 (P&L, Cashflow, Budget) + B2 (analytics lanjut) | Decision support |
| **5** | A3 (SEO menyeluruh) + A9 (perf) + B6 (konten AI) | Akuisisi organik |
| **6** | B3 (manifest, QR, auto-room) | Operasional lapangan |
| **7** | B4 (campaign) + B5 (PWA, referral) | Pertumbuhan |
| **8** | B7 (tenant billing) + B8 (KYC, compliance) | Enterprise readiness |

---

## Pertanyaan Konfirmasi

1. **Mulai dari batch mana?** Saya rekomendasikan **Batch 2 (HPP & Profitabilitas)** dulu karena itu permintaan eksplisit Anda, lalu Batch 1 untuk stabilisasi. Atau ingin Batch 1 dulu?
2. **Lingkup HPP**: apakah biaya HPP per **paket** saja (rata-rata), atau per **keberangkatan** (lebih akurat karena harga tiket & hotel berubah)? Saya sarankan **per keberangkatan** dengan fallback ke paket.
3. **Multi-currency HPP**: apakah biaya HPP perlu disimpan dalam mata uang asli (USD/SAR) + auto-convert ke IDR via tabel `currencies`? Atau cukup input langsung IDR?
4. **Komisi agen + PIC** apakah dikurangkan dari profit dalam laporan? (Saya asumsikan ya.)

Setelah Anda jawab, saya lanjut implementasi sesuai batch yang dipilih.
