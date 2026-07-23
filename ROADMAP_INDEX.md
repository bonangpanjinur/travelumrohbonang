# ROADMAP PENGEMBANGAN — Index Fase

> Terakhir diperbarui: 23 Juli 2026  
> Status keseluruhan: **Fase 1–5 menunggu eksekusi**

Dokumen ini menggantikan/melengkapi tiga file roadmap sebelumnya dengan membagi semua pekerjaan yang **belum selesai** ke dalam fase-fase berurutan yang siap dikerjakan.

---

## Ringkasan Fase

| Fase | Nama | Estimasi | Prasyarat | Status |
|------|------|----------|-----------|--------|
| [Fase 1](FASE_1_ARSITEKTUR_PAKET.md) | Refaktor Arsitektur Paket & Keberangkatan | ~3 hari | — | 🔲 Belum |
| [Fase 2](FASE_2_FONDASI_KEUANGAN.md) | Fondasi Akuntansi (CoA, Buku Besar, Laporan) | ~5–6 hari | Fase 1 selesai | 🔲 Belum |
| [Fase 3](FASE_3_OPERASIONAL_LAPANGAN.md) | Operasional Lapangan (Visa, Perlengkapan, Kursi, Checklist) | ~5.5 hari | Fase 1 selesai | 🔲 Belum |
| [Fase 4](FASE_4_KEUANGAN_LANJUTAN.md) | Keuangan Lanjutan (HPP Aktual, Rekonsiliasi Bank) | ~4–5 hari | Fase 2 selesai | 🔲 Belum |
| [Fase 5](FASE_5_COMPLIANCE_PENGUATAN.md) | Compliance & Penguatan (Pajak, Budget, Multi-Currency, Offline) | ~8–9 hari | Fase 3 & 4 selesai | 🔲 Belum |

**Total estimasi: ~26–29 hari kerja**

---

## Urutan Pengerjaan yang Direkomendasikan

```
Fase 1 (Arsitektur)
   ├── Fase 2 (Keuangan) ──► Fase 4 (Keuangan Lanjutan)
   └── Fase 3 (Operasional)                               ──► Fase 5 (Compliance)
```

Fase 2 dan Fase 3 bisa **dikerjakan paralel** setelah Fase 1 selesai.

---

## Sumber Dokumen Asli

| File | Keterangan |
|------|------------|
| `ROADMAP_PENGEMBANGAN.md` | Detail arsitektur paket & keberangkatan (→ Fase 1) |
| `FINANCE_OPERASIONAL_ROADMAP.md` | Semua item F-7 s.d. F-15 dan O-8 s.d. O-13 (→ Fase 2–5) |
| `RENCANA_PENGEMBANGAN.md` | Semua sprint & backlog (sudah 100% selesai — referensi saja) |
