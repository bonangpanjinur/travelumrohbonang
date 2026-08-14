# Role Matrix Browser Findings

Tanggal pengujian: 14 Agustus 2026.

Frontend Vite berhasil berjalan pada `http://127.0.0.1:8080`. Saat membuka `/admin` tanpa sesi admin, halaman tetap putih dan console mencatat kegagalan request `site-settings` serta `SEO` melalui `apiFetch`. Tidak ada backend API yang berjalan pada sesi lokal tersebut, sehingga smoke-check browser tidak dapat menyelesaikan redirect/auth flow atau memuat panel admin.

Console juga mencatat peringatan `Multiple GoTrueClient instances detected`; ini bersifat warning dan bukan penyebab utama kegagalan. Pengujian browser role-specific memerlukan staging dengan API, database, Supabase Auth, dan empat credential uji yang valid.
