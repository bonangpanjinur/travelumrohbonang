# Audit Fitur Paket Tabungan

## Ringkasan Eksekutif

Fitur Paket Tabungan sudah memiliki fondasi dasar yang cukup baik: rekening per user, setoran pending, verifikasi admin, penggunaan saldo untuk booking dengan transaksi database dan `SELECT FOR UPDATE`, serta notifikasi. Namun, fitur ini belum aman untuk operasi finansial multi-tenant secara penuh.

Risiko terbesar berada pada **tenant isolation admin**, **pencairan/penutupan rekening**, **atomicity verifikasi dan refund**, **integritas ledger**, serta **ketiadaan constraint database**. Berdasarkan audit source code, fitur sebaiknya belum dianggap sebagai modul keuangan final sebelum temuan P0 dan P1 diperbaiki.

## Temuan Prioritas

| Prioritas | Temuan | Dampak |
|---|---|---|
| P0 | Route `/api/admin/savings` hanya memakai `requireFinance`, tetapi tidak menerapkan scope branch/agent pada statistik, daftar, detail, verifikasi, penolakan, maupun refund. | User finance dari cabang/agent berpotensi melihat dan mengubah rekening tabungan lintas tenant. |
| P0 | Proses penutupan rekening membuat transaksi withdrawal `pending`, tetapi langsung mengubah rekening menjadi `closed`. Tidak ada endpoint admin untuk approve/reject withdrawal. | Permintaan pencairan dapat menggantung, tidak masuk statistik pending, dan tidak memiliki alur penyelesaian. |
| P0 | Verifikasi deposit dan refund dilakukan dalam beberapa query terpisah tanpa transaksi database dan tanpa row lock. | Request bersamaan dapat menggandakan saldo atau menghasilkan transaksi tanpa update saldo yang sepadan. |
| P1 | `recordFinancialTransaction` pada penggunaan tabungan sengaja dijalankan di luar transaksi utama dan error-nya tidak menggagalkan response. | Saldo tabungan bisa berkurang dan booking dianggap dibayar, tetapi jurnal keuangan tidak tercatat. |
| P1 | `savings_transactions.account_id`, `booking_id`, `recorded_by`, dan `savings_accounts.user_id` tidak memiliki foreign key database. | Data yatim, identitas tidak valid, dan hubungan transaksi dengan user/booking tidak dijamin database. |
| P1 | Tidak ada check constraint untuk amount, type, status, atau saldo non-negatif. | Data invalid dapat masuk melalui migration, script, atau endpoint baru yang melewati validasi aplikasi. |
| P1 | Tidak ada idempotency key atau unique constraint untuk mencegah submit deposit yang sama berulang kali. | User dapat mengirim bukti yang sama berkali-kali dan admin harus memproses duplikasi. |
| P1 | Validasi `targetPackageId` hanya mencari package dan tidak memastikan paket aktif atau berada dalam scope yang sesuai. | Rekening dapat dibuat untuk paket tidak aktif atau paket yang tidak seharusnya tersedia bagi user. |
| P2 | `targetPackageName` didenormalisasi tanpa mekanisme sinkronisasi ketika nama paket berubah. | Nama target pada rekening dapat berbeda dengan nama paket aktual. |
| P2 | Admin UI menampilkan pending deposit, tetapi tidak terlihat dukungan operasional yang setara untuk pending withdrawal. | Dashboard tidak merepresentasikan seluruh kewajiban pencairan. |
| P2 | Belum terlihat audit log khusus untuk siapa yang memverifikasi, menolak, atau mencairkan selain field dasar pada transaksi. | Investigasi sengketa dan rekonsiliasi menjadi lebih sulit. |

## Temuan Detail

### 1. Tenant isolation admin belum diterapkan

File `artifacts/api-server/src/routes/admin/index.ts` memasang route savings dengan guard finance, sedangkan `artifacts/api-server/src/routes/admin/savings.ts` tidak memanggil `resolveUserScope`, `buildBookingScopeCondition`, atau pemeriksaan branch/agent. Query daftar memakai seluruh `savings_accounts`, query statistik menghitung seluruh tabel, dan endpoint detail/verify/reject/refund hanya memeriksa `accountId`.

Ini berbeda dari pola route booking dan dokumen yang sudah menerapkan scope. Perbaikannya harus dilakukan di level query dan object ownership, bukan hanya menyembunyikan menu UI.

### 2. Alur withdrawal belum selesai

Pada `artifacts/api-server/src/routes/savings.ts`, endpoint `POST /:id/close` membuat transaksi `withdrawal` berstatus `pending`, kemudian langsung mengubah `savings_accounts.status` menjadi `closed`. Pada sisi admin, route hanya menyediakan verify/reject untuk `type = deposit`. Statistik juga hanya menghitung pending deposit.

Akibatnya, rekening tertutup dengan saldo dapat memiliki withdrawal pending yang tidak memiliki tombol penyelesaian. Desain yang lebih aman adalah mempertahankan rekening dalam status `closure_requested` atau `withdrawal_pending` sampai admin menyetujui atau menolak permintaan.

### 3. Race condition pada verifikasi dan refund

Endpoint admin verify melakukan pemeriksaan status pending, update transaksi menjadi verified, lalu update saldo dalam query terpisah. Dua request paralel dapat membaca status pending sebelum salah satunya selesai. Endpoint refund juga melakukan insert transaksi dan update saldo tanpa satu transaksi database.

Pola yang disarankan adalah satu `db.transaction` dengan `SELECT ... FOR UPDATE` pada rekening dan transaksi, pemeriksaan ulang status di dalam lock, lalu update ledger dan saldo secara atomic.

### 4. Ledger keuangan dapat tidak sinkron

Endpoint penggunaan saldo sudah mengunci rekening dan melakukan debit dalam transaksi utama, tetapi pencatatan `financial_transactions` dilakukan setelah transaksi selesai dan error hanya dicatat ke log. Ini membuat dua sumber kebenaran dapat berbeda.

Perbaikannya adalah memasukkan jurnal keuangan dalam transaksi yang sama jika tabel dan helper mendukung transaksi Drizzle. Jika integrasi eksternal memang harus asynchronous, diperlukan status `posting_pending`, retry queue, dan rekonsiliasi otomatis.

### 5. Constraint database masih terlalu longgar

Schema `lib/db/src/schema/savings.ts` sengaja melewati foreign key untuk menghindari mismatch UUID/TEXT. Keputusan ini menghindari error migration, tetapi mengorbankan integritas data. Karena `profiles.id` bertipe UUID, rekomendasi yang aman adalah mengubah `savings_accounts.user_id` dan `savings_transactions.recorded_by` menjadi UUID, melakukan backfill/validasi data lama, kemudian menambahkan FK dengan `ON DELETE RESTRICT` atau `SET NULL` sesuai kebutuhan.

Untuk transaksi, `account_id` sebaiknya memiliki FK ke `savings_accounts.id`, sedangkan `booking_id` dapat menggunakan FK nullable ke `bookings.id`. Tambahkan check constraint untuk:

```sql
amount <> 0
status IN ('pending', 'verified', 'rejected')
type IN ('deposit', 'withdrawal', 'booking_payment', 'refund')
current_balance >= 0
target_amount >= 0
```

### 6. Duplikasi deposit belum dicegah

Endpoint deposit membuat UUID transaksi baru setiap kali request diterima. Tidak ada idempotency key, hash bukti, atau unique constraint berdasarkan kombinasi akun, nominal, waktu, dan referensi upload. Implementasi ideal memakai `idempotency_key` dari client dan unique index `(account_id, idempotency_key)`.

### 7. Validasi paket target belum lengkap

Saat membuka rekening, `targetPackageId` hanya digunakan untuk mencari nama dan base price. Tidak ada validasi bahwa paket aktif, keberangkatan tersedia, atau paket tersebut boleh digunakan oleh user pada tenant tertentu. Target amount juga dapat berasal dari request client tanpa batas bawah yang kuat.

## Kekuatan yang Sudah Ada

Pola penggunaan saldo untuk booking merupakan bagian paling kuat saat ini. Endpoint tersebut sudah menjalankan transaksi database, mengunci rekening dengan `FOR UPDATE`, memverifikasi ownership booking terhadap user, melakukan debit dan pencatatan transaksi secara berurutan, serta mencegah saldo menjadi negatif pada jalur normal.

Selain itu, user-facing route sudah membatasi daftar dan detail rekening menggunakan `user_id` dari session, bukan ID yang dikirim bebas oleh client. Ini merupakan dasar yang baik untuk memperkuat admin scope.

## Urutan Perbaikan yang Disarankan

| Sprint | Fokus | Hasil yang diharapkan |
|---|---|---|
| Sprint 1 | Tenant scope admin | Statistik, daftar, detail, verify, reject, dan refund hanya bekerja pada data scope user. |
| Sprint 2 | Withdrawal workflow | Tambah status request pencairan, endpoint approve/reject, notifikasi, dan dashboard pending withdrawal. |
| Sprint 3 | Atomic financial operations | Verifikasi deposit dan refund memakai transaction + row lock + idempotency. |
| Sprint 4 | Database integrity | Tambah FK yang kompatibel UUID, check constraint, unique index, serta migration backfill. |
| Sprint 5 | Reconciliation | Jurnal keuangan atomic atau queue retry, saldo dihitung ulang dari ledger, dan laporan selisih. |

## Kesimpulan

Paket Tabungan saat ini layak untuk prototipe operasional terbatas, tetapi belum cukup kuat untuk menjadi buku pembantu keuangan yang sepenuhnya dapat diaudit. Prioritas tertinggi adalah memperbaiki isolasi tenant admin dan menyelesaikan lifecycle withdrawal. Setelah itu, atomicity transaksi serta constraint database perlu diperkuat agar saldo dan mutasi tidak dapat berbeda karena race condition atau data invalid.
