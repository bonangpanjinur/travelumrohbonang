# Sprint 0 — Finance Integrity Audit

Dokumen ini menjelaskan pemeriksaan integritas data keuangan yang bersifat **read-only**. Audit tidak memperbaiki atau menghapus data secara otomatis. Setiap hasil harus ditinjau oleh finance/administrator sebelum dilakukan koreksi melalui workflow resmi.

## Cara Menjalankan

Jalankan file `scripts/finance-integrity-audit.sql` melalui Supabase SQL Editor atau PostgreSQL client:

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f scripts/finance-integrity-audit.sql
```

Script memulai transaksi `READ ONLY`, menjalankan seluruh query pemeriksaan, menampilkan detail baris bermasalah, menampilkan ringkasan pass/fail, lalu melakukan `COMMIT` terhadap transaksi read-only.

## Pemeriksaan yang Dilakukan

| Check | Tujuan |
|---|---|
| `non_positive_booking_payments` | Menemukan payment booking dengan nominal nol atau negatif |
| `non_positive_manual_payments` | Menemukan bukti pembayaran manual dengan nominal nol atau negatif |
| `non_positive_financial_transactions` | Menemukan jurnal dengan nominal nol atau negatif |
| `booking_overpayment` | Menemukan total payment aktif yang melebihi harga booking |
| `duplicate_active_payment_reference` | Menemukan referensi pembayaran aktif yang muncul lebih dari sekali |
| `refund_exceeds_received_amount` | Menemukan total refund selesai yang melebihi total payment aktif |
| `invalid_refund_request` | Menemukan refund dengan nominal atau status tidak valid |
| `verified_payment_without_journal` | Menemukan payment manual verified tanpa jurnal auto-posting yang diharapkan |
| `paid_gateway_without_booking_payment` | Menemukan transaksi gateway paid yang belum masuk ledger booking |
| `duplicate_financial_reference` | Menemukan referensi jurnal dengan line lebih dari satu event double-entry |
| `unbalanced_journal` | Menemukan referensi jurnal dengan total debit tidak sama dengan credit |
| `fully_paid_booking_status_mismatch` | Menemukan booking yang sudah lunas tetapi status operasionalnya tidak sesuai |
| `invalid_package_cost` | Menemukan qty atau nominal biaya paket yang tidak valid |
| `invalid_budget` | Menemukan periode, tipe, atau nominal budget yang tidak valid |

## Interpretasi Hasil

Hasil ideal untuk seluruh check adalah **nol baris masalah** dan `passed = true` pada bagian ringkasan. Nilai non-zero bukan berarti data boleh langsung diubah. Setiap kasus harus diklasifikasikan terlebih dahulu sebagai data valid yang salah terdeteksi, data historis, duplikasi, atau bug proses.

Untuk overpayment, periksa apakah terdapat gateway retry, pembayaran yang belum di-void, atau pembulatan currency. Untuk refund berlebih, cocokkan refund dengan bukti transfer bank keluar. Untuk jurnal tidak seimbang, jangan membuat baris lawan secara manual sebelum mengetahui event asalnya karena hal tersebut dapat memperburuk saldo ledger.

## Prosedur Koreksi yang Disarankan

Pertama, export hasil query dan simpan sebagai evidence dengan waktu pemeriksaan, environment, dan operator. Kedua, rekonsiliasi setiap kasus dengan bukti bank, payment gateway, dokumen refund, dan booking terkait. Ketiga, gunakan endpoint/workflow reversal atau void yang memiliki audit trail; hindari `DELETE` langsung pada tabel transaksi. Keempat, jalankan kembali audit hingga semua exception yang memang harus nol telah ditangani atau diberi waiver terdokumentasi.

## Batasan

Script ini melakukan kontrol konsistensi berbasis tabel yang tersedia. Script belum dapat membuktikan bahwa nominal benar-benar cocok dengan rekening bank, invoice vendor, atau settlement gateway. Script juga belum menjadi pengganti accounting close, bank reconciliation, atau review akuntan.
