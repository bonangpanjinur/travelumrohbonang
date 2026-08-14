# Sprint 4 — Audit Keamanan dan Error Handling

## Ringkasan

Sprint 4 meninjau autentikasi, otorisasi, validasi input, upload, webhook/payment gateway, audit log, dan response error backend. Perubahan yang diterapkan berfokus pada pencegahan kebocoran detail exception, validasi payload payment gateway, dan penguatan dependency resolution.

## Perubahan yang diterapkan

| Area | Perubahan | Dampak |
|---|---|---|
| Global error handler | Menghapus spread exception (`...err`) dan diagnostic logger duplikat | Mengurangi risiko object exception, cause, dan metadata internal masuk ke log secara tidak terkendali |
| Payment gateway | Memvalidasi gateway, nominal positive safe integer, `bookingId`, dan `orderId` | Menolak payload malformed sebelum request ke provider |
| Payment gateway error | Response provider dan error 500 diganti menjadi pesan generik | Detail provider, database, dan exception tidak dikirim ke client |
| Itinerary dan pilgrim error | Response 500 tidak lagi memuat `err.message` sebagai `detail` | Mengurangi kebocoran query/path/internal error |
| Dependency | `react-router-dom` diperbarui; override `postcss`, `nanoid`, `brace-expansion`, dan `ip-address` ditambahkan pada workspace config | Mengurangi vulnerability transitive yang memiliki patched release |

## Sisa risiko

`xlsx` masih terdeteksi oleh `pnpm audit` karena advisory yang dilaporkan tidak memiliki patched release menurut registry. Dependency ini masih digunakan oleh import/export Excel pada `artifacts/api-server/src/routes/admin/pilgrims.ts`. Penggantian ke `exceljs` merupakan pekerjaan terpisah karena perlu mempertahankan parsing template dan kompatibilitas file `.xls`/`.xlsx`; jangan menghapus `xlsx` tanpa menguji ulang alur import jemaah.

Hasil akhir dependency audit produksi adalah **6 vulnerability**: 1 low, 3 moderate, dan 2 high, seluruhnya berasal dari `xlsx`. Audit harus dijalankan ulang setelah dependency tersebut diganti atau diisolasi.

## Batasan verifikasi

Pemeriksaan static dan typecheck dapat dijalankan di environment repository, tetapi pengujian webhook provider, permission object storage, dan response production memerlukan environment staging dengan credential yang valid. Jangan mengaktifkan credential production di local development.

## Checklist deployment

1. Jalankan `pnpm install --frozen-lockfile`.
2. Jalankan `pnpm audit --prod --audit-level high` dan simpan output pada release record.
3. Jalankan `pnpm run typecheck`.
4. Uji payment gateway dengan nominal invalid, order ID invalid, provider rejection, dan timeout.
5. Uji upload bukti dengan file oversized, MIME spoofing, token invalid, dan user di luar scope.
6. Pastikan response production tidak mengandung `stack`, SQL text, path filesystem, atau provider error detail.
7. Setelah penggantian `xlsx`, jalankan kembali template download, import maksimal 500 baris, dan export manifest.
