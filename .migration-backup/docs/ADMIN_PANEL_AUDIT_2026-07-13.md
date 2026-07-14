# Audit Panel Admin — 13 Juli 2026

Audit menyeluruh terhadap `artifacts/umroh-app/src/features/admin` (~50 halaman) dan backend terkait (`artifacts/api-server/src/routes/admin`). Referensi silang dengan `docs/BUG_TRACKER.md` yang sudah ada agar tidak duplikat.

## 1. Daftar Fitur Panel Admin

| Kelompok | Fitur | Status |
|---|---|---|
| Operasional | Paket, Jadwal Keberangkatan, Itinerary, Jemaah, Dokumen Jemaah, Manifest, Check-in (QR) | CRUD lengkap |
| Keuangan | Accounting, Pembayaran (verifikasi), Cicilan, Refund, Penarikan Dana Agen, Payment Gateway (config) | CRUD lengkap, gateway pembayaran belum terhubung ke provider nyata |
| Marketing/CRM | CRM (leads & follow-up), Kupon, Loyalty/Poin, Leaderboard | CRUD lengkap |
| CMS/Konten | Blog, FAQ, Galeri, Navigasi, Halaman, Testimoni, SEO, Slug Redirect, Advantages/Keunggulan, Services, Floating Buttons | CRUD lengkap |
| Sistem | Manajemen Role, Users, Multi-Branch/Tenant Sites, System Health, Audit Log, Error Log, REST Diagnostic Log, Integrations, Settings (tampilan/branding) | CRUD/monitoring lengkap |
| Belum matang | Analitik AI | **Tidak fungsional** — lihat bug #1 |

Hierarki role: `super_admin > admin > branch_manager > staff > agent > buyer`, digating per-menu di `adminMenuConfig.ts` dan per-route di backend (`requireAdmin`/`requireStaff`/`requireFinance`/`requireSuperAdmin`).

## 2. Bug yang Ditemukan & Diperbaiki Hari Ini

| # | Halaman | Bug | Perbaikan |
|---|---|---|---|
| 1 | 11 halaman: ErrorLogs, Dashboard, SlugRedirects, Coupons, Chats, SEO, Branches, AuditLogs, Agents, AgentWithdrawals, RestDiagLogs, CheckIn | **Silent failure** — saat fetch data gagal, error hanya di-`console.log`, admin tidak tahu data gagal dimuat (halaman tampak kosong tanpa penjelasan) | Ditambahkan toast error di semua titik ini |
| 2 | Settings.tsx | Tombol "Reset ke Default" tampilan pakai `window.confirm` browser (tidak konsisten dengan dialog konfirmasi bertema di halaman lain, bisa diblokir popup blocker) | Diganti dengan `AlertDialog` bertema, konsisten dengan pola konfirmasi hapus di halaman lain |

Typecheck monorepo bersih setelah semua perubahan, kedua workflow (`API Server`, `Start application`) diverifikasi jalan normal, homepage & halaman terkait diverifikasi via screenshot.

## 3. Bug/Gap yang Sudah Diketahui Tapi Belum Selesai (dari `BUG_TRACKER.md`, masih valid)

| ID | Item | Kenapa belum dikerjakan hari ini |
|---|---|---|
| B7 (P1) | Payment gateway (Midtrans/Xendit) belum terintegrasi — pembayaran hanya manual transfer + upload bukti | Butuh API key asli dari provider (`MIDTRANS_SERVER_KEY`/`XENDIT_API_KEY`) — perlu keputusan provider + kredensial dari Anda |
| B10 (P2) | Halaman "Analitik AI" (`/admin/analytics-ai`) memanggil Supabase Edge Function yang **tidak ada** di project ini — fitur 100% tidak berfungsi kalau diklik | Butuh keputusan: (a) sembunyikan menu sampai siap, atau (b) bangun backend AI baru (perlu API key LLM) — lihat pertanyaan di bawah |
| B11 (P2) | CRUD kontrak jemaah di sisi admin sudah ada GET/PATCH/DELETE, tapi belum ada endpoint untuk admin membuat kontrak baru secara manual (saat ini kontrak hanya dibuat dari sisi pembeli) | Scope lebih besar, perlu keputusan alur bisnis (apakah admin memang perlu membuat kontrak manual) |
| B13 (P3) | Format response error di `faqs.ts` sedikit tidak konsisten dengan route lain | Kosmetik, dampak sangat kecil, sengaja diprioritaskan lebih rendah dari perbaikan silent-failure di atas |
| TD1 | Sebagian halaman admin memanggil Supabase client langsung, sebagian lewat API server (dua jalur akses data) | Ini pola arsitektur yang sudah ada di banyak halaman (bukan bug satu halaman), perbaikannya adalah migrasi bertahap ke satu jalur — technical debt besar, bukan quick-fix |

## 4. Alur Operasional Utama (End-to-End)

1. **Booking → Pembayaran → Manifest**: Admin/pembeli buat booking → pembeli upload bukti transfer → admin verifikasi di halaman Pembayaran → status booking otomatis jadi "paid" → jemaah dimanifestkan ke jadwal keberangkatan di halaman Manifest.
2. **Verifikasi Pembayaran**: Admin filter status "pending" di Pembayaran → dialog konfirmasi → approve/reject → trigger update status booking.
3. **Agen & Komisi**: Komisi dihitung otomatis dari jumlah jemaah × komisi paket → agen ajukan penarikan dana dari portal agen → admin approve/reject di Agent Withdrawals → admin upload bukti transfer manual sebagai bukti pencairan.
4. **Publikasi Paket**: Admin buat paket → atur jadwal keberangkatan & harga kamar (dialog terpisah untuk bulk pricing) → set `is_active: true` → otomatis tampil di halaman publik.
5. **Role & Staff**: Role dikelola di Role Management (khusus super_admin) dan Users; role tersimpan di tabel `user_roles`, dibaca ulang oleh `authMiddleware` di setiap request admin.
6. **CMS**: Perubahan Blog/FAQ/Galeri/Settings langsung tersimpan ke database dan langsung terlihat di situs publik (tidak ada mode preview sebelum publish — bisa jadi peningkatan ke depan kalau dibutuhkan).

## 5. Rencana Pengerjaan (Diurutkan)

- ✅ **Selesai hari ini**: perbaikan silent-failure (12 lokasi) + window.confirm → AlertDialog.
- **Menunggu keputusan Anda** (lihat pertanyaan): integrasi payment gateway (B7), nasib halaman Analitik AI (B10).
- **Follow-up terpisah** (scope lebih besar, technical debt, bukan bug mendesak): unifikasi jalur akses data (TD1), CRUD kontrak manual admin (B11).
