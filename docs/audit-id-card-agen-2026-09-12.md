# Audit Fitur ID Card Agen

**Tanggal audit:** 12 September 2026  
**Repository:** `bonangpanjinur/travelumrohbonang`  
**Ruang lingkup:** alur admin untuk membuka ID card agen, preview, pembuatan PDF, pencetakan, QR/referral, data publik agen, validasi backend, dan konsistensi schema.

## Ringkasan Eksekutif

Fitur ID card sudah memiliki fondasi yang baik. Admin dapat membuka preview kartu, melihat sisi depan dan belakang, serta mengunduh PDF berukuran CR80. Data agen dibatasi berdasarkan scope pada endpoint admin, dan endpoint publik tidak mengembalikan sebagian field operasional seperti komisi, email, tanggal lahir, dan user ID.

Namun, fitur ini belum siap dianggap selesai untuk penggunaan operasional tanpa perbaikan. **Masalah paling nyata adalah tombol cetak tidak tersedia walaupun fungsi `printCards` sudah dibuat.** Selain itu, QR ID card membawa parameter referral sedangkan QR pada tabel agen tidak membawanya, sehingga sumber referral dapat hilang pada jalur QR admin. Status publik agen juga tidak memeriksa `validUntil`, sehingga agen yang masa berlaku ID card atau MOU-nya sudah lewat tetap dapat tampil sebagai agen resmi selama statusnya masih aktif.

## Temuan Prioritas

| ID | Severity | Temuan | Dampak |
|---|---|---|---|
| F-01 | Tinggi | Fungsi pencetakan tersedia di kode tetapi tidak pernah dipanggil dari UI | Admin hanya dapat mengunduh PDF, bukan mencetak langsung dari fitur; alur `printCards` menjadi dead code |
| F-02 | Tinggi | URL QR ID card berbeda dari URL QR pada tabel admin | QR ID card menyimpan referral, sedangkan QR tabel hanya menuju slug; atribusi booking dapat tidak konsisten |
| F-03 | Tinggi | Endpoint publik tidak memeriksa `validUntil` | Agen yang sudah kedaluwarsa masih dapat ditampilkan sebagai “Agen Resmi” |
| F-04 | Sedang | Field `bannerIdCardUrl` disimpan dan diedit, tetapi tidak digunakan dalam preview atau PDF | Admin dapat mengira banner ID card akan tampil, padahal hasil kartu selalu memakai desain hard-coded |
| F-05 | Sedang | Validasi tanggal `joinedAt` dan `validUntil` tidak setara dengan `dateOfBirth` | Nilai tanggal yang salah dapat masuk ke alur backend atau menghasilkan kegagalan database yang tidak informatif |
| F-06 | Sedang | PDF ID card mencetak email agen pada sisi belakang | Kartu fisik dapat menyebarkan data kontak yang seharusnya tidak selalu perlu dicetak |
| F-07 | Rendah | Pengunduhan PDF tidak memiliki penanganan error pengguna yang terlihat | Kegagalan mengambil foto/logo atau membuat QR ditelan diam-diam dan hasil kartu dapat berbeda tanpa penjelasan |

## Detail Temuan dan Bukti

### F-01 — Tombol cetak hilang dari UI

**Lokasi:** `artifacts/umroh-app/src/features/admin/components/AgentIdCardDialog.tsx:107-120`.

Komponen mendefinisikan fungsi `printCards`, yang membuka jendela baru, membangun dua sisi kartu, lalu memanggil `window.print()`. Akan tetapi, toolbar dialog pada baris 126 hanya merender tombol **Download PDF**. Tidak ada tombol yang memanggil `printCards`. Import `Printer` juga tidak digunakan.

**Dampak:** pengguna tidak dapat menjalankan jalur cetak langsung meskipun implementasinya sudah tersedia. Ini juga meningkatkan risiko kode mati karena fungsi cetak tidak teruji melalui penggunaan normal.

**Rekomendasi:** tambahkan tombol **Cetak** yang memanggil `printCards`, nonaktifkan tombol saat proses berlangsung, dan tampilkan toast ketika popup diblokir. Tambahkan pengujian render yang memastikan tombol tersebut memanggil handler.

### F-02 — QR referral tidak konsisten

**Lokasi ID card:** `AgentIdCardDialog.tsx:39`.  
**Lokasi QR tabel:** `artifacts/umroh-app/src/features/admin/pages/Agents.tsx:271-287` dan `:405-406`.

ID card membentuk URL berikut:

```text
/agen/<slug>?ref=<referralCode atau agentCode>
```

Sebaliknya, `publicUrl` pada halaman agen hanya membentuk:

```text
/agen/<slug>
```

Fungsi `downloadQr`, dialog QR admin, tautan publik pada tabel, dan tombol buka halaman memakai URL kedua. Dengan demikian, QR yang dibuat dari ID card mengandung referral, sedangkan QR yang diunduh dari kolom **Publik / QR** tidak.

Halaman publik memang mengarahkan booking memakai `agent.referralCode` dari API, tetapi mekanisme capture referral global juga menyimpan query `ref` dari URL. Dua jalur tersebut tidak seharusnya memiliki perilaku atribusi yang berbeda.

**Rekomendasi:** buat satu helper URL kanonik, misalnya `publicAgentUrl(agent, { includeReferral: true })`, lalu gunakan helper yang sama pada ID card, QR admin, link salin, dan link buka halaman. Tambahkan test bahwa semua QR agen memuat referral yang sama.

### F-03 — Masa berlaku tidak mengontrol status publik

**Lokasi:** `artifacts/api-server/src/routes/public-agents.ts:39-43`.

Query publik hanya mensyaratkan:

```ts
eq(agents.isActive, true),
eq(agents.publicPageEnabled, true)
```

Field `validUntil` tidak dipilih dan tidak digunakan sebagai syarat. Sementara itu, ID card menampilkan `validUntil` pada `AgentIdCardDialog.tsx:102` dan memberi label bahwa kartu berlaku sesuai masa kerja sama.

**Dampak:** tanggal kedaluwarsa pada kartu tidak merepresentasikan status publik. Agen yang kartu atau MOU-nya berakhir masih dapat muncul sebagai agen resmi dan menerima booking melalui halaman publik.

**Rekomendasi:** tentukan aturan bisnis secara eksplisit. Jika `validUntil` adalah batas otorisasi agen, endpoint publik harus menolak tanggal yang sudah lewat, misalnya dengan kondisi `validUntil IS NULL OR validUntil >= CURRENT_DATE`. Jika masa berlaku hanya informasi cetak dan tidak mengontrol publikasi, tampilkan label yang tidak ambigu dan tambahkan job atau indikator admin untuk agen kedaluwarsa.

### F-04 — `bannerIdCardUrl` tidak digunakan

**Lokasi:** schema `lib/db/src/schema/agents.ts:31-34`, form admin `Agents.tsx:332-334`, dan payload `Agents.tsx:153-173`.

Field `bannerIdCardUrl` tersedia pada database, form admin, dan payload API. Namun, `AgentIdCardDialog.tsx` tidak membaca field tersebut. Preview, PDF, dan HTML cetak semuanya memakai desain hard-coded serta logo branding umum.

**Dampak:** nilai yang diisi admin tidak memengaruhi hasil ID card. Label **BANNER & ID CARD** menimbulkan ekspektasi bahwa URL tersebut akan dipakai.

**Rekomendasi:** pilih salah satu kontrak. Hapus field dari form jika tidak diperlukan, atau gunakan URL tersebut sebagai background/banner dengan fallback desain default. Jika URL adalah aset publik, validasi asal URL dan format file sebelum dimasukkan ke HTML/PDF.

### F-05 — Validasi tanggal belum lengkap

**Lokasi:** `artifacts/api-server/src/routes/admin/agents.ts:72-91`.

`dateOfBirth` divalidasi dengan regex `YYYY-MM-DD`, tetapi `joinedAt` dan `validUntil` hanya dikonversi menjadi string. Tidak ada pemeriksaan format, tanggal kalender yang valid, atau relasi `validUntil >= joinedAt`.

**Dampak:** data tanggal tidak konsisten dapat tersimpan atau gagal pada database dengan respons 500 generik. Kesalahan tanggal juga dapat menghasilkan kartu yang menampilkan informasi masa berlaku yang keliru.

**Rekomendasi:** gunakan helper validasi tanggal yang sama untuk ketiga field. Validasi bahwa tanggal benar-benar ada di kalender dan, bila keduanya diisi, `validUntil` tidak lebih awal dari `joinedAt`. Kembalikan HTTP 400 dengan pesan field yang jelas.

### F-06 — Email dicetak pada PDF fisik

**Lokasi:** `AgentIdCardDialog.tsx:102`.

PDF menulis baris `Email`, sedangkan HTML cetak hanya menampilkan `Kontak` dengan prioritas nomor telepon lalu email. Informasi tersebut juga ikut dalam kartu fisik yang mudah difoto atau dibagikan.

**Dampak:** paparan data kontak lebih luas daripada kebutuhan verifikasi identitas pada kartu.

**Rekomendasi:** default-kan kartu fisik ke nomor telepon atau kanal resmi perusahaan. Jadikan email sebagai opsi konfigurasi yang sengaja diaktifkan admin, bukan default. Dokumentasikan field mana yang memang boleh tercetak.

### F-07 — Kegagalan aset ditangani secara diam-diam

**Lokasi:** `AgentIdCardDialog.tsx:79-93` dan `:101`.

Kegagalan mengambil foto atau logo diabaikan, dan kegagalan QR juga hanya menyebabkan QR dihilangkan. Pengguna tidak menerima notifikasi bahwa hasil PDF tidak lengkap.

**Dampak:** admin dapat mengedarkan kartu tanpa foto, logo, atau QR tanpa mengetahui penyebabnya.

**Rekomendasi:** tampilkan warning non-blocking jika aset gagal dimuat. Untuk QR, pertimbangkan menjadikan kegagalan sebagai error yang mencegah download karena QR merupakan bagian penting dari identifikasi/atribusi. Tambahkan fallback yang konsisten antara preview, PDF, dan hasil cetak.

## Hal yang Sudah Baik

| Area | Hasil audit |
|---|---|
| Scope admin | Endpoint admin agen menggunakan `resolveUserScope` dan memeriksa scope pada baca, buat, ubah, serta hapus agen |
| Pemisahan data publik | Endpoint publik tidak mengembalikan email, tanggal lahir, komisi, user ID, MOU, atau masa berlaku |
| Sanitasi HTML cetak | Data teks pada HTML cetak dilewatkan melalui `escapeHtml` sebelum dimasukkan ke `document.write` |
| QR | QR dibuat dengan error correction level tinggi dan memiliki margin |
| Fallback data | Preview tetap dapat dibuat ketika foto, cabang, slug, atau field kartu belum lengkap |
| Ukuran kartu | PDF dan CSS cetak sama-sama menargetkan ukuran CR80 `53.98 × 85.6 mm` |

## Verifikasi yang Dilakukan

| Pemeriksaan | Hasil |
|---|---|
| Pencarian seluruh referensi ID card, QR, barcode, dan agen | Berhasil; komponen utama dan route terkait teridentifikasi |
| Pemeriksaan tenant guard | Lulus: `53 mutation route files checked` |
| Typecheck | Belum dapat dijalankan karena dependency lokal belum terpasang; `tsc: not found` |
| Test suite | Belum dapat dijalankan karena dependency lokal belum terpasang; `vitest: not found` |
| Pemeriksaan manual alur UI | Menemukan `printCards` tidak memiliki pemanggil |
| Pemeriksaan manual URL QR | Menemukan ketidakkonsistenan query `ref` antara ID card dan QR admin |

## Urutan Perbaikan yang Disarankan

Pertama, tambahkan tombol cetak dan test untuk memastikan alur cetak dapat dijalankan. Kedua, satukan pembentukan URL publik agar seluruh QR mempertahankan referral. Ketiga, putuskan apakah `validUntil` mengontrol status publik, lalu terapkan aturan tersebut secara konsisten di endpoint publik dan UI admin. Keempat, rapikan kontrak `bannerIdCardUrl` dan validasi tanggal. Terakhir, minimalkan data kontak pada kartu fisik dan tampilkan peringatan saat aset gagal dimuat.

## Kesimpulan

Fitur ID card **sudah berjalan untuk preview dan download PDF**, tetapi **belum lengkap untuk operasi cetak dan belum konsisten untuk atribusi referral serta masa berlaku agen**. Tidak ditemukan pada audit statis ini indikasi bahwa endpoint admin mengabaikan scope tenant. Sebelum dipakai sebagai identitas resmi di lapangan, perbaikan F-01 sampai F-03 sebaiknya diprioritaskan.

## References

[1]: https://github.com/bonangpanjinur/travelumrohbonang "Repository travelumrohbonang"
