# Spesifikasi UI/UX Wireframe
## Alur Booking Frontend dengan Aturan Pembayaran dan Pilihan Invoice

**Produk:** Travel Umroh Bonang  
**Platform:** Web responsive, customer-facing frontend  
**Status dokumen:** Spesifikasi siap digunakan untuk desain visual dan implementasi  
**Versi:** 1.0  
**Tanggal:** 28 Agustus 2026

---

## 1. Tujuan produk

Alur booking harus membuat pelanggan memahami tiga hal sebelum mengirim booking: **apa yang dipesan**, **berapa total kewajibannya**, dan **aturan pembayaran apa yang berlaku**. Informasi ini harus muncul sebelum pelanggan menyetujui booking, bukan hanya setelah booking berhasil dibuat atau ketika invoice sudah dicetak.

Selain itu, pelanggan harus dapat memilih bentuk dokumen yang ingin diterima setelah booking dibuat. Pilihan invoice tidak boleh mengubah perhitungan harga atau policy. Pilihan tersebut hanya menentukan apakah pelanggan ingin menerima **invoice tagihan**, **jadwal pembayaran**, atau **invoice dan kuitansi setelah pembayaran diverifikasi**.

> Prinsip utama: **jangan menyembunyikan aturan penting di balik halaman setelah checkout**. Ringkasan harus terlihat di halaman booking, sedangkan detail lengkap dapat dibuka melalui drawer atau modal.

## 2. Sasaran pengalaman pengguna

| Sasaran | Ukuran keberhasilan UX |
|---|---|
| Transparansi biaya | Pelanggan dapat melihat total harga, diskon, DP minimum, pembayaran berikutnya, dan sisa pembayaran sebelum submit. |
| Pemahaman policy | Pelanggan dapat mengetahui deadline, metode pembayaran, biaya pembatalan, refund, dan konsekuensi keterlambatan. |
| Persetujuan sadar | Tombol submit tidak aktif sebelum pelanggan mencentang persetujuan aturan pembayaran dan syarat booking. |
| Fleksibilitas dokumen | Pelanggan dapat memilih invoice digital, download setelah booking, email, atau WhatsApp sesuai channel yang tersedia. |
| Minim kesalahan | Validasi dilakukan ketika data berubah dan server menghitung ulang nominal final. |
| Mobile-first | Informasi penting tetap terbaca tanpa harus membuka banyak panel atau melakukan horizontal scroll. |

## 3. Struktur alur booking yang disarankan

Gunakan model **stepper empat tahap**. Pada desktop, stepper ditampilkan horizontal di bagian atas. Pada mobile, stepper menjadi indikator progres ringkas dengan label tahap aktif.

| Tahap | Nama | Tujuan |
|---:|---|---|
| 1 | Paket & Keberangkatan | Memilih paket, tanggal keberangkatan, jumlah jemaah, dan opsi kamar. |
| 2 | Data Jemaah | Mengisi data pemesan dan data seluruh jemaah. |
| 3 | Pembayaran & Invoice | Melihat ringkasan harga, aturan pembayaran, metode pembayaran awal, dan pilihan dokumen. |
| 4 | Review & Konfirmasi | Meninjau seluruh data, menyetujui policy, dan membuat booking. |

Pada implementasi saat ini, halaman booking sudah memiliki data paket, departure, kamar, jemaah, dan total. Spesifikasi ini menambahkan lapisan policy serta invoice pada tahap ketiga dan keempat tanpa menghilangkan alur yang sudah ada.

---

## 4. Wireframe global halaman booking

### 4.1 Desktop layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Navbar: Logo | Paket | Keberangkatan | Bantuan | Akun                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ ① Paket ───── ② Data Jemaah ───── ③ Pembayaran & Invoice ───── ④ Review     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AREA UTAMA 8 kolom                         RINGKASAN 4 kolom                │
│  ┌─────────────────────────────────────┐   ┌──────────────────────────────┐ │
│  │ Judul tahap                         │   │ Ringkasan Booking             │ │
│  │ Konten form / aturan pembayaran     │   │ Paket                         │ │
│  │                                     │   │ Keberangkatan                 │ │
│  │                                     │   │ Jumlah jemaah                 │ │
│  │                                     │   │ Total harga                   │ │
│  │                                     │   │ DP minimum                    │ │
│  │                                     │   │ Sisa estimasi                 │ │
│  │                                     │   │                                │ │
│  │                                     │   │ [Lihat rincian harga]         │ │
│  └─────────────────────────────────────┘   └──────────────────────────────┘ │
│                                                                              │
│  [Kembali]                                               [Lanjutkan]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Mobile layout

```text
┌─────────────────────────────┐
│ ← Booking                    │
│ Tahap 3 dari 4               │
│ Pembayaran & Invoice         │
├─────────────────────────────┤
│ Ringkasan harga              │
│ Total       Rp xx.xxx.xxx    │
│ DP minimum  Rp x.xxx.xxx     │
│ Sisa        Rp xx.xxx.xxx    │
│ [Lihat rincian]              │
├─────────────────────────────┤
│ Aturan pembayaran            │
│ [Ringkasan policy]           │
│ [Baca lengkap]               │
├─────────────────────────────┤
│ Pilihan pembayaran awal      │
│ ○ Bayar DP minimum           │
│ ○ Bayar penuh                │
├─────────────────────────────┤
│ Pilihan invoice              │
│ □ Invoice digital            │
│ □ Kirim ke email             │
│ □ Kirim ke WhatsApp          │
├─────────────────────────────┤
│ □ Saya menyetujui aturan    │
│   pembayaran dan syarat      │
│                             │
│ [Lanjutkan ke Review]        │
└─────────────────────────────┘
```

---

## 5. Tahap 1 — Paket dan keberangkatan

Tahap pertama bertugas memastikan policy yang ditampilkan nantinya berasal dari kombinasi **global policy + package override + departure override** bila tersedia.

### Komponen

| Komponen | Detail UX |
|---|---|
| Package summary card | Menampilkan nama paket, durasi, fasilitas utama, harga mulai, dan link “Lihat detail paket”. |
| Departure selector | Menampilkan tanggal, sisa kuota, status availability, dan label promo bila ada. |
| Pax counter | Menambah/mengurangi jumlah jemaah. Setiap perubahan memicu kalkulasi harga dan policy ulang. |
| Room selector | Menampilkan tipe kamar, jumlah kamar, harga per jemaah, dan subtotal. |
| Policy teaser | Setelah departure dipilih, tampilkan bar kecil: “DP mulai dari …, pelunasan maksimal H-…, lihat aturan pembayaran”. |
| Continue CTA | Tombol aktif hanya jika paket, departure, jumlah pax, dan kamar valid. |

### Policy teaser

```text
┌─────────────────────────────────────────────────────────────┐
│ Informasi pembayaran                                        │
│ DP mulai dari Rp 5.000.000 atau 30% dari harga paket.       │
│ Pelunasan maksimal 30 hari sebelum keberangkatan.           │
│                                                             │
│ [Lihat aturan pembayaran lengkap →]                         │
└─────────────────────────────────────────────────────────────┘
```

Jika policy gagal dimuat, jangan menampilkan nominal perkiraan sebagai nominal final. Tampilkan status “Aturan pembayaran sedang dimuat” dan nonaktifkan CTA sampai policy berhasil diambil atau sistem memiliki fallback resmi yang sudah ditetapkan backend.

---

## 6. Tahap 2 — Data jemaah

Tahap ini mempertahankan form data jemaah yang sudah tersedia, tetapi perlu menambahkan indikator dampak terhadap invoice.

### Perbaikan UX yang direkomendasikan

| Area | Spesifikasi |
|---|---|
| Progress data | Tampilkan `Jemaah 1 dari N`, status lengkap/belum lengkap, dan progress bar. |
| Pemesan | Pisahkan jelas “Data pemesan” dari “Data jemaah”. Pemesan boleh berbeda dari jemaah. |
| Data wajib | Tandai nama, nomor telepon, email, gender, tanggal lahir, dan passport sesuai aturan bisnis yang berlaku. |
| Privacy note | Tambahkan keterangan bahwa data dipakai untuk booking, dokumen perjalanan, dan penerbitan invoice. |
| Invoice recipient | Sediakan pilihan “Invoice atas nama pemesan” atau “Invoice atas nama lain”. |
| Autosave | Draft form dapat disimpan lokal/session-safe tanpa menyimpan data sensitif melebihi kebutuhan. |

### Invoice recipient block

```text
┌─────────────────────────────────────────────────────────────┐
│ Penerima invoice                                            │
│ ● Gunakan data pemesan                                      │
│ ○ Gunakan data lain                                         │
│                                                             │
│ Nama penerima invoice                                       │
│ [________________________________________]                  │
│ Email penerima                                              │
│ [________________________________________]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Tahap 3 — Pembayaran dan Invoice

Ini adalah layar utama untuk kebutuhan yang diminta. Layar harus memakai struktur **summary-first**: total dan kewajiban paling penting tampil dahulu, kemudian aturan lengkap, lalu pilihan pembayaran dan invoice.

### 7.1 Wireframe desktop

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Pembayaran & Invoice                                                         │
│ Pahami total biaya dan aturan pembayaran sebelum melanjutkan.                │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ RINGKASAN KEWAJIBAN                  │ PILIHAN PEMBAYARAN AWAL                │
│                                      │                                       │
│ Total paket        Rp 30.000.000     │ ○ Bayar DP minimum                    │
│ Diskon             -Rp  1.000.000    │   Rp 8.700.000                        │
│ Total akhir        Rp 29.000.000     │   Jatuh tempo hari ini                │
│                                      │                                       │
│ DP minimum         Rp 8.700.000      │ ○ Bayar penuh                         │
│ Persentase         30%               │   Rp 29.000.000                       │
│ Sisa setelah DP    Rp 20.300.000      │                                       │
│                                      │ Metode pembayaran                     │
│ [Lihat rincian harga]                │ [Transfer Bank ▼]                    │
├──────────────────────────────────────┴───────────────────────────────────────┤
│ ATURAN PEMBAYARAN                                                            │
│ ✓ DP minimal 30% atau Rp 8.700.000                                           │
│ ✓ Pelunasan maksimal 30 hari sebelum keberangkatan                          │
│ ✓ Bukti pembayaran dikirim maksimal 1 hari setelah transfer                  │
│ ✓ Pembatalan mengikuti tier biaya berdasarkan waktu                          │
│                                                                              │
│ [Baca aturan lengkap]                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ PILIHAN INVOICE                                                             │
│ Dokumen akan dibuat setelah booking berhasil.                                │
│                                                                              │
│ ☑ Invoice digital                                                             │
│   Dapat diunduh dari halaman Booking Saya.                                   │
│                                                                              │
│ ☑ Kirim invoice ke email                                                      │
│   [email@contoh.com____________________]                                     │
│                                                                              │
│ ☐ Kirim notifikasi invoice via WhatsApp                                      │
│   Nomor: +62 8xx-xxxx-xxxx                                                   │
│                                                                              │
│ ☐ Sertakan jadwal cicilan pada invoice                                       │
│                                                                              │
│ [Preview invoice]                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ ☐ Saya telah membaca dan menyetujui aturan pembayaran serta syarat booking.  │
│                                                                              │
│ [← Kembali]                                             [Lanjutkan Review →]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Struktur kartu ringkasan kewajiban

Kartu ini harus selalu terlihat pada desktop dan menjadi sticky bottom sheet pada mobile. Label harus membedakan **total harga**, **uang yang harus dibayar sekarang**, dan **sisa estimasi**.

| Field | Label UI | Keterangan |
|---|---|---|
| `totalPrice` | Total harga | Harga akhir setelah diskon/biaya yang berlaku. |
| `minimumDueNow` | Harus dibayar sekarang | Nominal DP atau pembayaran penuh sesuai pilihan. |
| `remainingAfterCurrentPayment` | Sisa setelah pembayaran ini | Estimasi kewajiban setelah nominal saat ini. |
| `nextDueDate` | Jatuh tempo berikutnya | Diambil dari schedule snapshot. |
| `currency` | Mata uang | Ditampilkan konsisten, misalnya IDR. |

Jangan gunakan label “Pendapatan”, “Lunas”, atau “Sudah dibayar” pada tahap sebelum transaksi benar-benar diverifikasi. Gunakan istilah “kewajiban”, “estimasi”, dan “menunggu verifikasi” bila sesuai.

---

## 8. Komponen aturan pembayaran

### 8.1 Ringkasan policy

Ringkasan maksimal menampilkan lima poin yang paling penting. Detail lainnya berada dalam accordion atau modal.

```text
┌─────────────────────────────────────────────────────────────┐
│ Aturan pembayaran untuk Paket Umroh Reguler                 │
│ Berlaku mulai 1 September 2026                              │
├─────────────────────────────────────────────────────────────┤
│ 1. DP minimum       30% / Rp 8.700.000                      │
│ 2. Pelunasan        Maksimal H-30                            │
│ 3. Bukti bayar      Kirim maksimal 1 hari                   │
│ 4. Pembatalan       Potongan sesuai jarak keberangkatan     │
│ 5. Refund           Diproses setelah verifikasi admin        │
│                                                             │
│ [Lihat semua ketentuan]                                     │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Modal aturan lengkap

```text
┌─────────────────────────────────────────────────────────────┐
│ Aturan Pembayaran                                    [×]    │
├─────────────────────────────────────────────────────────────┤
│ Ringkasan                                                   │
│                                                             │
│ Jadwal pembayaran                                           │
│ ┌────┬────────────────────┬──────────────┬───────────────┐ │
│ │ No │ Tahap              │ Nominal      │ Jatuh tempo   │ │
│ │ 1  │ DP                 │ Rp 8.700.000 │ Hari ini      │ │
│ │ 2  │ Cicilan 1          │ Rp 10.150.000│ H-90          │ │
│ │ 3  │ Pelunasan          │ Rp 10.150.000│ H-30          │ │
│ └────┴────────────────────┴──────────────┴───────────────┘ │
│                                                             │
│ Metode pembayaran                                          │
│ • Transfer bank                                             │
│ • Payment gateway                                           │
│                                                             │
│ Pembatalan dan refund                                       │
│ Teks policy lengkap yang dapat dibaca pelanggan.            │
│                                                             │
│ Biaya perubahan paket                                       │
│ Teks atau nominal sesuai policy.                            │
├─────────────────────────────────────────────────────────────┤
│ [Tutup]                                                     │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Sumber dan versi policy

Pada modal detail, tampilkan metadata ringan: “Aturan ini berlaku untuk paket dan keberangkatan yang Anda pilih” serta tanggal efektif. Jangan menampilkan detail internal seperti ID policy atau informasi audit kepada pelanggan.

---

## 9. Pilihan pembayaran awal

Pilihan pembayaran hanya ditampilkan bila policy mengizinkan lebih dari satu opsi.

| Opsi | Kapan tampil | Perilaku |
|---|---|---|
| Bayar DP minimum | Policy memiliki DP dan booking memenuhi syarat | Amount otomatis diisi nominal minimum. |
| Bayar nominal lain | Hanya jika policy mengizinkan nominal fleksibel | Validasi minimum dan maksimum dilakukan server-side. |
| Bayar penuh | Selalu jika payment method tersedia dan total valid | Amount sama dengan total akhir. |
| Belum bayar sekarang | Hanya bila bisnis mengizinkan booking reservation tanpa payment | Tampilkan deadline approval/reservation secara jelas. |

Jika booking dibuat tanpa pembayaran, CTA harus menggunakan label **“Buat Booking dan Bayar Nanti”**, bukan “Konfirmasi Pembayaran”. Jika user memilih DP atau penuh, label berubah menjadi **“Lanjutkan ke Pembayaran”** dan setelah booking dibuat diarahkan ke payment page.

---

## 10. Komponen pilihan invoice

### 10.1 Prinsip

Pilihan invoice berada setelah aturan pembayaran karena invoice merupakan output dokumen dari booking. Pelanggan tidak boleh menganggap pilihan invoice mengubah harga atau status pembayaran.

### 10.2 Wireframe pilihan invoice

```text
┌─────────────────────────────────────────────────────────────┐
│ Pilihan invoice                                             │
│ Pilih bagaimana Anda ingin menerima dokumen booking.        │
├─────────────────────────────────────────────────────────────┤
│ ☑ Invoice digital                                           │
│   Tersedia otomatis di Booking Saya setelah booking dibuat. │
│                                                             │
│ ☑ Kirim melalui email                                      │
│   Email                                                     │
│   [nama@email.com____________________________]              │
│                                                             │
│ ☐ Kirim link melalui WhatsApp                               │
│   Nomor WhatsApp                                           │
│   [+62 8_______________________________]                   │
│                                                             │
│ ☑ Tampilkan aturan pembayaran di invoice                    │
│   Disarankan agar jadwal dan ketentuan selalu terdokumentasi│
│                                                             │
│ ☐ Sertakan daftar lengkap jemaah                             │
│   Untuk keperluan administrasi rombongan.                   │
│                                                             │
│ [Preview invoice dengan data saat ini]                       │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Opsi invoice dan default

| Opsi | Default | Catatan |
|---|---:|---|
| Invoice digital di portal | Aktif dan wajib | Selalu tersedia di Booking Saya. |
| Kirim email | Aktif jika email valid | Tidak boleh gagal membuat booking jika provider email sedang bermasalah. Status menjadi `email_pending`. |
| Kirim WhatsApp | Nonaktif atau sesuai konfigurasi | Memerlukan opt-in dan nomor valid. Status menjadi `whatsapp_pending` bila antrean gagal. |
| Tampilkan aturan pembayaran | Aktif | Policy snapshot harus masuk ke dokumen. |
| Sertakan daftar jemaah | Aktif untuk group booking, opsional untuk single | Ikuti konfigurasi privacy dan recipient. |
| Sertakan jadwal cicilan | Aktif jika ada installment schedule | Jika tidak ada schedule, opsi disembunyikan. |

### 10.4 Pilihan format dokumen

Pada versi awal, jangan meminta pelanggan memilih terlalu banyak format. Gunakan default **PDF digital + HTML preview**. Pilihan PNG atau print dapat ditambahkan di halaman detail invoice setelah booking dibuat.

---

## 11. Tahap 4 — Review dan konfirmasi

Tahap review harus menggabungkan seluruh keputusan pelanggan dengan struktur ringkas yang mudah dipindai.

```text
┌─────────────────────────────────────────────────────────────┐
│ Review Booking                                             │
│ Periksa data berikut sebelum membuat booking.                │
├─────────────────────────────────────────────────────────────┤
│ Paket & keberangkatan                         [Ubah]        │
│ Paket Umroh Reguler • 12 Oktober 2026                       │
│ 2 jemaah • Double                                           │
│                                                             │
│ Data pemesan                                   [Ubah]        │
│ Ahmad Fauzan • ahmad@email.com                              │
│                                                             │
│ Pembayaran                                    [Ubah]        │
│ Bayar DP minimum • Rp 8.700.000                             │
│ Pelunasan H-30                                              │
│                                                             │
│ Invoice                                       [Ubah]        │
│ Digital + email • aturan pembayaran disertakan              │
│                                                             │
│ Aturan penting                                               │
│ [Baca kembali aturan pembayaran]                            │
│                                                             │
│ ☐ Saya menyetujui data booking, aturan pembayaran,           │
│   kebijakan pembatalan/refund, dan syarat layanan.           │
│                                                             │
│ [← Kembali]                            [Buat Booking]        │
└─────────────────────────────────────────────────────────────┘
```

### CTA dan microcopy

| Kondisi | Label CTA | Status |
|---|---|---|
| Semua valid, policy disetujui | Buat Booking | Aktif. |
| Ada payment awal | Lanjutkan ke Pembayaran | Aktif. |
| Policy belum dibaca | Baca dan setujui aturan pembayaran | Mengarahkan ke policy accordion/modal. |
| Data belum lengkap | Lengkapi data terlebih dahulu | Disabled atau scroll ke error pertama. |
| Policy berubah saat review | Tinjau perubahan aturan | Blocking; tampilkan diff ringkas. |
| Request sedang dikirim | Membuat booking… | Disabled, cegah double submit. |

---

## 12. Halaman hasil booking

Setelah booking berhasil, tampilkan status yang membedakan **booking dibuat**, **payment menunggu verifikasi**, dan **invoice tersedia**.

```text
┌─────────────────────────────────────────────────────────────┐
│ ✓ Booking berhasil dibuat                                   │
│ Kode booking: UMB-2026-00123                                │
├─────────────────────────────────────────────────────────────┤
│ Status booking: Menunggu pembayaran                         │
│ Status invoice: Invoice tersedia                            │
│ Status pembayaran: Belum dibayar / Menunggu verifikasi      │
├─────────────────────────────────────────────────────────────┤
│ Total booking       Rp 29.000.000                            │
│ Harus dibayar       Rp  8.700.000                            │
│ Jatuh tempo         Hari ini                                │
├─────────────────────────────────────────────────────────────┤
│ [Bayar sekarang] [Lihat invoice] [Download invoice]          │
│ [Bagikan ke email] [Kembali ke Booking Saya]                 │
├─────────────────────────────────────────────────────────────┤
│ Aturan pembayaran tersimpan pada invoice dan booking ini.   │
│ Policy version: ditampilkan sebagai tanggal efektif.         │
└─────────────────────────────────────────────────────────────┘
```

Jika email/WhatsApp gagal dikirim, booking tetap sukses. Tampilkan pesan non-blocking: “Booking berhasil. Invoice tersedia untuk diunduh. Pengiriman email akan dicoba kembali.”

---

## 13. Halaman detail invoice pelanggan

Halaman ini diakses dari `Booking Saya`, hasil booking, atau notifikasi.

```text
┌─────────────────────────────────────────────────────────────┐
│ ← Booking Saya                       Invoice #INV-2026-00123 │
├─────────────────────────────────────────────────────────────┤
│ [Paid / Partially Paid / Awaiting Payment / Overdue]         │
│ Paket Umroh Reguler • Berangkat 12 Oktober 2026              │
├─────────────────────────────────────────────────────────────┤
│ Total invoice       Rp 29.000.000                            │
│ Sudah dibayar       Rp  8.700.000                            │
│ Sisa pembayaran     Rp 20.300.000                            │
│ Jatuh tempo berikut H-90                                     │
├─────────────────────────────────────────────────────────────┤
│ [Download PDF] [Print] [Kirim email] [Bagikan link]          │
├─────────────────────────────────────────────────────────────┤
│ Tab: Ringkasan | Jadwal Pembayaran | Riwayat Bayar | Policy  │
├─────────────────────────────────────────────────────────────┤
│ Jadwal pembayaran                                           │
│ ✓ DP             Rp 8.700.000      Diverifikasi              │
│ ○ Cicilan 1      Rp10.150.000      Jatuh tempo H-90          │
│ ○ Pelunasan      Rp10.150.000      Jatuh tempo H-30          │
└─────────────────────────────────────────────────────────────┘
```

Invoice customer harus menampilkan status dokumen, bukan hanya tombol print. Status minimum: `Tersedia`, `Menunggu pembayaran`, `Sebagian dibayar`, `Lunas`, `Jatuh tempo`, `Dibatalkan`, dan `Digantikan oleh invoice baru`.

---

## 14. State UI yang wajib dirancang

| State | Tampilan | Perilaku |
|---|---|---|
| Loading policy | Skeleton pada policy card dan summary | CTA tahap berikutnya disabled. |
| Policy unavailable | Alert dengan tombol coba lagi | Jangan mengizinkan submit tanpa policy final atau fallback resmi. |
| Policy updated | Banner “Aturan berubah” + ringkasan perubahan | Minta pelanggan membaca ulang dan menyetujui kembali. |
| Price recalculating | Spinner kecil dekat total | Pertahankan form, disable submit sementara. |
| Payment option unavailable | Alert pada metode terkait | Tawarkan metode lain jika tersedia. |
| Email invalid | Inline error di bawah email | Opsi email tidak dapat dipilih sampai valid. |
| WhatsApp invalid | Inline error nomor | Jangan mengirim ke nomor yang belum valid. |
| Duplicate submit | CTA loading dan idempotency | Jangan membuat dua booking. |
| Booking success/payment pending | Success page dengan status berbeda | Sediakan invoice dan payment action. |
| Invoice generation pending | Status “Sedang menyiapkan invoice” | Polling terbatas atau refresh manual. |
| Invoice delivery failed | Warning non-blocking | Download tetap tersedia, retry channel disediakan. |
| Offline/network error | Toast + persistent inline error | Data form tetap dipertahankan. |
| Session expired | Modal login/reauth | Jangan menghapus input yang tidak sensitif. |

---

## 15. Responsive behavior

### Desktop

Gunakan layout dua kolom dengan summary card sticky di sisi kanan. Modal policy memiliki lebar maksimum 720–800 px. Tombol utama selalu berada di footer konten, tetapi summary tetap terlihat ketika user melakukan scroll.

### Tablet

Gunakan dua kolom ketika lebar mencukupi. Jika tidak, pindahkan summary ke bagian atas sebelum policy. Hindari tabel schedule terlalu lebar; ubah menjadi stacked cards bila viewport kurang dari 768 px.

### Mobile

Gunakan satu kolom. Summary harga berubah menjadi accordion atau sticky bottom sheet. CTA utama full-width. Policy detail memakai bottom sheet atau modal full-screen. Jadwal pembayaran ditampilkan sebagai timeline vertikal, bukan tabel.

```text
Mobile schedule:

● Hari ini       DP              Rp 8.700.000
│                Menunggu pembayaran
│
○ H-90           Cicilan 1       Rp10.150.000
│
○ H-30           Pelunasan       Rp10.150.000
```

---

## 16. Accessibility dan content design

Semua input harus memiliki label, bukan hanya placeholder. Accordion policy harus dapat dioperasikan dengan keyboard dan memiliki `aria-expanded`. Warna status pembayaran tidak boleh menjadi satu-satunya pembeda; sertakan label teks dan ikon yang memiliki keterangan. Nominal rupiah harus menggunakan format yang konsisten. Hindari istilah internal seperti `paymentPolicySnapshot`, `ruleCode`, `effectiveFrom`, atau `pending_verification` pada UI pelanggan.

Gunakan kalimat yang langsung dan tidak ambigu. Contoh yang disarankan adalah “Pelunasan paling lambat 30 hari sebelum keberangkatan”. Hindari “Final payment due: -30 days” pada sisi pelanggan.

---

## 17. Integrasi API yang dibutuhkan

| Endpoint | Kegunaan | Output utama |
|---|---|---|
| `GET /api/packages/:packageId/payment-policy?departureId=` | Mengambil policy customer-visible | Policy final, schedule preview, effective date, version label. |
| `POST /api/bookings/quote` | Menghitung quote sebelum submit | Total, diskon, DP minimum, schedule, fees, currency. |
| `POST /api/bookings` | Membuat booking secara atomik | Booking ID, booking code, policy snapshot, schedule snapshot, invoice intent. |
| `GET /api/bookings/:id/invoice` | Mengambil invoice customer | Invoice status, totals, template snapshot, document URLs. |
| `POST /api/bookings/:id/invoice-delivery` | Meminta delivery email/WhatsApp | Delivery job ID dan status. |
| `POST /api/bookings/:id/payments` | Memulai payment atau submit proof | Payment intent/status, amount server-calculated. |
| `GET /api/bookings/:id/payment-schedule` | Menampilkan timeline kewajiban | Schedule items, due date, paid/pending/overdue. |

### Aturan integrasi penting

Frontend hanya mengirim pilihan dan data input. Frontend tidak boleh menjadi sumber kebenaran untuk total, DP, biaya pembatalan, jadwal, atau status lunas. Backend harus menghitung ulang policy final berdasarkan paket/departure aktif, menyimpan snapshot, dan mengembalikan quote yang dapat dirender frontend.

Request create booking harus memiliki idempotency key agar double click, retry jaringan, atau refresh tidak menciptakan booking ganda. Response perlu memisahkan `bookingStatus`, `paymentStatus`, `invoiceStatus`, dan `deliveryStatus`.

---

## 18. Model status yang disarankan

| Entitas | Status minimum |
|---|---|
| Booking | `draft`, `waiting_payment`, `confirmed`, `paid`, `completed`, `cancelled`, `expired`. |
| Payment | `initiated`, `pending_verification`, `paid`, `rejected`, `voided`, `refunded`, `partially_refunded`. |
| Invoice | `draft`, `issued`, `partially_paid`, `paid`, `overdue`, `voided`, `superseded`. |
| Delivery | `not_requested`, `queued`, `sent`, `failed`, `retrying`. |

Jangan menyamakan `bookingStatus = paid` dengan `paymentStatus = paid` tanpa rekonsiliasi. UI dapat menampilkan ringkasan status, tetapi data internal tetap memakai field terpisah.

---

## 19. Event tracking UX

Event berikut perlu dicatat untuk mengevaluasi funnel dan menemukan titik kebingungan pelanggan.

| Event | Parameter |
|---|---|
| `payment_policy_viewed` | packageId, departureId, source, policyVersion. |
| `payment_policy_expanded` | section, policyVersion. |
| `payment_option_selected` | option, amount, currency. |
| `invoice_option_changed` | channel, enabled. |
| `invoice_preview_opened` | bookingDraftId, sectionVisibility. |
| `booking_review_opened` | paxCount, totalPrice. |
| `payment_policy_accepted` | policyVersion, timestamp. |
| `booking_submitted` | bookingId, paymentOption, invoiceChannels. |
| `invoice_downloaded` | invoiceId, format. |
| `invoice_delivery_retry` | invoiceId, channel. |

Event tidak boleh menyimpan nomor passport, NIK, bukti pembayaran, atau data sensitif lain.

---

## 20. Acceptance criteria

### Policy dan booking

1. Setelah package dan departure dipilih, ringkasan DP serta deadline pelunasan tampil sebelum pelanggan mengisi review.
2. Halaman booking menampilkan policy efektif yang sesuai kombinasi global, paket, dan departure.
3. Pelanggan dapat membuka detail schedule, refund, cancellation, payment methods, dan bukti pembayaran.
4. Tombol submit tidak aktif sebelum persetujuan policy dicentang.
5. Backend menghitung ulang total, DP, fee, dan schedule; nominal dari frontend tidak dipercaya.
6. Policy yang berubah pada saat review memunculkan notifikasi dan memerlukan persetujuan ulang.
7. Booking lama tetap menggunakan snapshot policy saat booking dibuat.

### Invoice

1. Pelanggan dapat memilih invoice digital, email, WhatsApp, dan section policy sesuai konfigurasi.
2. Invoice digital selalu tersedia di Booking Saya walaupun delivery email/WhatsApp gagal.
3. Preview invoice menampilkan total, payment schedule, aturan pembayaran, dan recipient sesuai pilihan.
4. Status invoice dipisahkan dari status booking dan payment.
5. Invoice dapat diunduh atau dicetak dari halaman hasil booking dan detail Booking Saya.
6. Invoice yang sudah diterbitkan menggunakan template dan policy snapshot yang tidak berubah secara retroaktif.

### Accessibility dan responsive

1. Semua field memiliki label dan inline validation.
2. Alur dapat diselesaikan menggunakan keyboard.
3. Mobile tidak memerlukan horizontal scroll untuk summary dan policy.
4. CTA utama terlihat jelas pada viewport mobile.
5. Error network dan delivery memiliki retry path tanpa menghapus data form.

---

## 21. Rekomendasi urutan desain dan implementasi

Mulai dengan wireframe low-fidelity untuk tahap ketiga dan keempat karena keduanya menjadi pusat kebutuhan baru. Setelah itu, validasikan terminologi “DP minimum”, “harus dibayar sekarang”, “sisa pembayaran”, “invoice tersedia”, dan “menunggu verifikasi” melalui usability test sederhana dengan calon pelanggan atau staf customer service.

Tahap implementasi pertama adalah endpoint quote dan effective policy. Tahap kedua adalah komponen `PaymentPolicySummary`, `PaymentPolicyDetailsModal`, `InvoiceOptions`, dan `BookingFinancialSummary`. Tahap ketiga adalah halaman hasil booking dan detail invoice. Tahap keempat adalah integrasi delivery email/WhatsApp, retry state, analytics event, dan automated test.

> **Prioritas MVP:** tampilkan policy dengan benar, minta persetujuan, hitung nominal dari backend, simpan snapshot, dan sediakan invoice digital. Pengiriman multi-channel serta editor desain invoice dapat menyusul tanpa menghambat transparansi booking.

## Referensi repository

[1]: `../artifacts/umroh-app/src/features/booking/pages/Booking.tsx` — Alur booking pelanggan yang menjadi titik integrasi utama.  
[2]: `../artifacts/umroh-app/src/features/booking/pages/Payment.tsx` — Halaman pembayaran pelanggan.  
[3]: `../artifacts/umroh-app/src/features/booking/pages/MyBookings.tsx` — Daftar booking dan akses dokumen pelanggan.  
[4]: `../artifacts/umroh-app/src/features/booking/components/InvoiceButton.tsx` — Tombol invoice pada sisi pelanggan.  
[5]: `../artifacts/api-server/src/lib/paymentPolicyResolver.ts` — Resolver policy global dan paket.  
[6]: `../lib/db/src/schema/bookings.ts` — Snapshot policy dan schedule pada booking.  
[7]: `../artifacts/umroh-app/src/features/admin/components/InvoiceGenerator.ts` — Isi invoice saat ini.  
