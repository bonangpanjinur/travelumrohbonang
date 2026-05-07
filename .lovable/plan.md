## Tahap 2 — Fitur Lanjutan per Role

Tahap 2 mencakup fitur yang ditunda dari Tahap 1. Karena lingkupnya besar, saya bagi menjadi **5 modul** yang dikerjakan berurutan dalam sesi ini.

---

### Modul 1 — Agen (Agent)
**Tujuan:** agen punya tools mandiri untuk tracking & cair komisi.

1. **Tabel baru `agent_commissions`** (sudah ada `package_commissions` global; ini per booking)
   - Kolom: `agent_id`, `booking_id`, `amount`, `status` (`pending`/`approved`/`paid`), `paid_at`
   - Trigger: saat booking `status='paid'` & `agent_id` not null → insert baris `pending`
2. **Tabel baru `agent_withdrawals`**
   - Kolom: `agent_id`, `amount`, `bank_name`, `bank_account`, `status` (`requested`/`approved`/`rejected`/`paid`), `proof_url`, `notes`, `processed_by`, `processed_at`
3. **Halaman `/agent` (AgentPortal sudah ada)** — tambahkan:
   - Card "Saldo Komisi" (sum `approved` - sum `paid`)
   - Tabel daftar komisi per booking + status
   - Form "Request Pencairan" → insert ke `agent_withdrawals`
   - Card "Link Referral" dengan tombol copy `https://site/?ref={referral_code}`
4. **Halaman admin baru `/admin/agent-withdrawals`** untuk approve/reject + upload bukti transfer
5. **Tracking referral**: simpan `?ref=` ke localStorage saat landing, attach ke booking saat checkout (di `Booking.tsx`)

### Modul 2 — Branch Manager
1. **Halaman `/branch/finance`** (BranchDashboard sudah ada) — tambahkan tab "Keuangan Cabang":
   - Filter `branch_id = get_user_branch_id(auth.uid())` otomatis
   - Total revenue, total komisi, total booking, breakdown per bulan (chart)
2. **Tab "Booking Cabang"** dengan filter otomatis cabang

### Modul 3 — Jamaah (lanjutan)
1. **E-ticket / Manifest digital**
   - Halaman baru `/my-bookings/:id/eticket` → render kartu boarding visual + QR code (data: booking_code) menggunakan lib `qrcode.react` 
   - Tombol "E-Ticket" di MyBookings (status `paid`)
2. **Refund Request**
   - Tabel baru `refund_requests` (`booking_id`, `user_id`, `reason`, `amount`, `status`, `processed_by`, `notes`)
   - Form di MyBookings untuk booking `paid` & belum berangkat
   - Halaman admin `/admin/refunds` untuk approve/reject

### Modul 4 — Admin & Super Admin
1. **Tabel baru `audit_logs`** (`user_id`, `action`, `entity_type`, `entity_id`, `metadata jsonb`, `ip`)
2. **Helper `logAudit()`** dipanggil di mutation kritis (delete booking, approve refund, withdraw, dll)
3. **Halaman `/admin/audit-logs`** dengan filter user/action/tanggal
4. **Halaman `/admin/role-management`** (super_admin only) — list user + dropdown ubah role
5. **Modul aktif/non-aktif per tenant** — sudah ada `tenant_sites`, tambah kolom `enabled_modules jsonb` + UI toggle di TenantSites detail

### Modul 5 — Komunikasi
1. **Chat CS sederhana**
   - Tabel `chat_messages` (`booking_id`, `sender_id`, `sender_role`, `message`, `is_read`)
   - Widget chat di MyBookings detail + admin panel di `/admin/chats`
   - Realtime via Supabase channel

---

### Yang TIDAK termasuk Tahap 2 (Tahap 3 nanti)
- Impersonate user (kompleks, butuh service-role edge function)
- Leaderboard agen kompetitif (gamification)
- Multi-currency / split payment

---

### Strategi Eksekusi
Saya kerjakan **modul 1 → 2 → 3 → 4 → 5** berurutan dalam satu sesi ini. Setiap modul = 1 migration + komponen frontend terkait. Setelah semua selesai, saya tampilkan ringkasan + lokasi menu baru.

**Konfirmasi:** Approve untuk mulai eksekusi semua 5 modul, atau pilih subset modul tertentu saja?