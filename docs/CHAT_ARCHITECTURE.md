# Arsitektur Chat — Vins Tour Travel

> **⚠️ Dokumen ini sudah digantikan.**
>
> Rencana chatbot AI (Gemini) **dibatalkan**.
> Sistem yang dibangun adalah **live chat langsung ke admin** — semua balasan dilakukan oleh admin manusia.
>
> **Dokumen aktif ada di: [`/chat_architecture.md`](../chat_architecture.md)**

---

## Keputusan Arsitektur

| Aspek | Keputusan |
|-------|-----------|
| Mode chat | Live chat langsung ke admin (bukan bot) |
| Real-time engine | Supabase `postgres_changes` |
| Pengguna | Admin, Jemaah (login), Calon Jemaah/Tamu (anonim) |
| Bot AI | ❌ Tidak digunakan |

Lihat `chat_architecture.md` di root project untuk rencana sprint lengkap.
