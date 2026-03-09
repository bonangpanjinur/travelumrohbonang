

# Rencana Pengembangan Sistem Travel Umroh

## Bagian 1: Restrukturisasi Sidebar & Menu

### Masalah Saat Ini
- Hamburger menu di mobile ada di kanan, perlu dipindah ke kiri
- Kategori menu sudah ada tapi perlu direorganisasi agar lebih terstruktur
- Premium items terpisah, sebaiknya diintegrasikan ke dalam kategori yang relevan

### Perubahan Sidebar

**Struktur menu baru yang lebih terorganisir:**

```text
UTAMA
  - Dashboard
  - Website Utama (link external)

OPERASIONAL
  - Paket Umroh
  - Keberangkatan
  - Itinerary
  - Booking
  - Jemaah
  - Dokumen Jemaah [Premium]

KEUANGAN
  - Pembayaran
  - Akuntansi & Keuangan [Premium]
  - Payment Gateway [Premium]
  - Laporan

PEMASARAN
  - CRM & Follow-up [Premium]
  - Kupon
  - Analitik AI [Premium]

MASTER DATA
  - Hotel
  - Maskapai
  - Bandara
  - Cabang
  - Agen
  - Muthawif

KONTEN & CMS
  - Blog
  - Galeri
  - Testimoni
  - FAQ
  - Halaman CMS
  - Keunggulan
  - Langkah Panduan
  - Layanan

PENGATURAN
  - Navigasi
  - Floating Button
  - Manajemen User
  - Multi-Bahasa [Premium]
  - Multi-Cabang [Premium]
  - Pengaturan Umum
```

**Perubahan UI:**
- Pindahkan hamburger icon ke **kiri** di `AdminHeader.tsx` (branding kiri, hamburger tetap kiri sebelum branding)
- Premium items ditandai badge bintang kecil, bukan di grup terpisah
- Grup yang tidak memiliki active route default collapsed (kecuali Utama)

### File yang diubah:
- `src/components/admin/adminMenuConfig.ts` - reorganisasi menu groups, integrasikan premium items
- `src/components/admin/AdminSidebar.tsx` - render premium badge inline, auto-collapse logic
- `src/components/admin/AdminHeader.tsx` - pindahkan hamburger ke kiri

---

## Bagian 2: Roadmap Fitur Premium (4 Phase)

### Phase 1 - Foundation (Sudah Ada + Penyempurnaan)
Fitur yang sudah dibangun, perlu dipoles:

1. **Akuntansi & Keuangan** (sudah ada)
   - Penyempurnaan: export PDF/Excel, kategori custom, rekonsiliasi dengan pembayaran booking

2. **CRM & Follow-up** (sudah ada)
   - Penyempurnaan: integrasi dengan data booking, auto-create lead dari inquiry, dashboard funnel visual

### Phase 2 - Dokumen & Pembayaran
3. **Manajemen Dokumen Jemaah**
   - Upload & tracking dokumen (paspor, visa, KTP, foto, surat mahram)
   - Status kelengkapan per jemaah (lengkap/belum)
   - Notifikasi dokumen expired (paspor < 6 bulan)
   - Checklist dokumen per paket
   - Database: tabel `pilgrim_documents` (pilgrim_id, doc_type, file_url, status, expiry_date)

4. **Payment Gateway**
   - Integrasi Midtrans/Xendit untuk pembayaran online
   - Auto-update status pembayaran
   - Generate virtual account
   - Notifikasi pembayaran otomatis
   - Database: tabel `payment_gateway_transactions` (payment_id, gateway, va_number, status, callback_data)

### Phase 3 - Intelligence & Scale
5. **Analitik AI**
   - Dashboard prediktif: tren penjualan, forecasting revenue
   - Rekomendasi harga paket berdasarkan demand
   - Analisis konversi lead-to-booking
   - Ringkasan otomatis performa bulanan (menggunakan Lovable AI / Gemini)
   - Segmentasi jemaah otomatis

6. **Multi-Cabang Dashboard**
   - Dashboard per cabang dengan data terpisah
   - Perbandingan performa antar cabang
   - Role `branch_admin` - hanya lihat data cabangnya
   - Laporan konsolidasi pusat
   - Database: tambah `branch_id` di tabel-tabel operasional

### Phase 4 - Global & Advanced
7. **Multi-Bahasa**
   - Support Bahasa Indonesia, English, Arabic
   - CMS content multi-language
   - Tabel `translations` (key, locale, value)
   - Language switcher di frontend

8. **Fitur Tambahan (Bonus)**
   - WhatsApp Integration (kirim notifikasi via WA API)
   - E-Ticket & boarding pass generator
   - Manasik scheduler (jadwal manasik + absensi)
   - Customer portal (jemaah bisa track status mandiri)
   - Rating & review post-trip otomatis

---

## Ringkasan Implementasi Sekarang

Yang akan dikerjakan dalam implementasi ini:

1. **Restrukturisasi sidebar** - reorganisasi menu, pindahkan hamburger ke kiri, integrasikan premium items ke dalam kategori
2. **Update `adminMenuConfig.ts`** - struktur menu baru dengan 7 grup yang lebih logis
3. **Update `AdminHeader.tsx`** - hamburger di kiri
4. **Update `AdminSidebar.tsx`** - premium items inline dengan badge, auto-collapse

File yang akan diubah:
- `src/components/admin/adminMenuConfig.ts`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminHeader.tsx`
- `src/components/admin/AdminBreadcrumb.tsx` (update label mapping)

