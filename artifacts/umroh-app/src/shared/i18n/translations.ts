export type Language = "id" | "en";

export const translations: Record<Language, Record<string, string>> = {
  id: {
    // Navbar
    "nav.home": "Beranda",
    "nav.packages": "Paket Perjalanan",
    "nav.gallery": "Galeri",
    "nav.blog": "Blog",
    "nav.login": "Masuk / Daftar",
    "nav.logout": "Keluar",
    "nav.my_account": "Akun Saya",
    "nav.my_dashboard": "Dashboard Saya",
    "nav.admin": "Administrasi",
    "nav.admin_dashboard": "Dashboard Admin",

    // Hero
    "hero.title": "Perjalanan Umroh Terbaik",
    "hero.subtitle": "Wujudkan ibadah umroh impian Anda bersama kami",
    "hero.cta": "Lihat Paket",

    // Services
    "services.title": "Layanan Kami",
    "services.subtitle": "Layanan terbaik untuk perjalanan ibadah Anda",

    // Packages
    "packages.title": "Paket Perjalanan",
    "packages.view_all": "Lihat Semua Paket",
    "packages.from": "Mulai dari",
    "packages.book_now": "Pesan Sekarang",
    "packages.details": "Detail",
    "packages.duration": "hari",
    "packages.departure": "Keberangkatan",
    "packages.quota": "Sisa Kuota",

    // FAQ
    "faq.title": "Pertanyaan Umum",
    "faq.subtitle": "Temukan jawaban untuk pertanyaan yang sering diajukan",

    // Testimonials
    "testimonials.title": "Testimoni Jemaah",
    "testimonials.subtitle": "Pengalaman jemaah kami",

    // CTA
    "cta.title": "Siap Berangkat Umroh?",
    "cta.subtitle": "Daftar sekarang dan wujudkan impian Anda",
    "cta.button": "Daftar Sekarang",

    // Footer
    "footer.rights": "Hak cipta dilindungi",

    // Gallery
    "gallery.title": "Galeri Foto",
    "gallery.subtitle": "Momen indah perjalanan jemaah kami",

    // Blog
    "blog.title": "Blog & Artikel",
    "blog.read_more": "Baca Selengkapnya",

    // Booking
    "booking.title": "Form Booking",
    "booking.room_selection": "Pilih Kamar",
    "booking.pilgrim_data": "Data Jemaah",
    "booking.confirmation": "PIC & Konfirmasi",
    "booking.total": "Total Harga",
    "booking.submit": "Konfirmasi Booking",
    "booking.success": "Booking berhasil!",

    // Auth
    "auth.login": "Masuk",
    "auth.register": "Daftar",
    "auth.email": "Email",
    "auth.password": "Kata Sandi",
    "auth.name": "Nama Lengkap",
    "auth.forgot_password": "Lupa kata sandi?",

    // Dashboard
    "dashboard.my_bookings": "Booking Saya",
    "dashboard.profile": "Profil",
    "dashboard.payments": "Pembayaran",

    // Admin common
    "admin.save": "Simpan",
    "admin.cancel": "Batal",
    "admin.delete": "Hapus",
    "admin.edit": "Edit",
    "admin.add": "Tambah",
    "admin.search": "Cari...",
    "admin.export_csv": "Export CSV",
    "admin.actions": "Aksi",
    "admin.status": "Status",
    "admin.loading": "Memuat...",
    "admin.no_data": "Belum ada data",
    "admin.confirm_delete": "Yakin ingin menghapus?",

    // Admin sidebar
    "admin.dashboard": "Dashboard",
    "admin.bookings": "Booking",
    "admin.packages_menu": "Paket",
    "admin.departures": "Keberangkatan",
    "admin.pilgrims": "Jemaah",
    "admin.payments_menu": "Pembayaran",
    "admin.agents": "Agen",
    "admin.branches": "Cabang",
    "admin.users": "Pengguna",
    "admin.settings": "Pengaturan",
    "admin.reports": "Laporan",
    "admin.crm": "CRM",
    "admin.analytics": "Analitik AI",
    "admin.multi_branch": "Multi-Cabang",
    "admin.accounting": "Akuntansi",

    // Common
    "common.all": "Semua",
    "common.active": "Aktif",
    "common.inactive": "Tidak Aktif",
    "common.yes": "Ya",
    "common.no": "Tidak",
    "common.close": "Tutup",
    "common.back": "Kembali",
    "common.next": "Selanjutnya",
    "common.previous": "Sebelumnya",
    "common.showing": "Menampilkan",
    "common.of": "dari",
    "common.language": "Bahasa",
  },
  en: {
    // Navbar
    "nav.home": "Home",
    "nav.packages": "Packages",
    "nav.gallery": "Gallery",
    "nav.blog": "Blog",
    "nav.login": "Login / Register",
    "nav.logout": "Logout",
    "nav.my_account": "My Account",
    "nav.my_dashboard": "My Dashboard",
    "nav.admin": "Administration",
    "nav.admin_dashboard": "Admin Dashboard",

    // Hero
    "hero.title": "Best Umrah Journey",
    "hero.subtitle": "Make your dream Umrah pilgrimage come true with us",
    "hero.cta": "View Packages",

    // Services
    "services.title": "Our Services",
    "services.subtitle": "The best services for your pilgrimage journey",

    // Packages
    "packages.title": "Travel Packages",
    "packages.view_all": "View All Packages",
    "packages.from": "Starting from",
    "packages.book_now": "Book Now",
    "packages.details": "Details",
    "packages.duration": "days",
    "packages.departure": "Departure",
    "packages.quota": "Remaining Quota",

    // FAQ
    "faq.title": "Frequently Asked Questions",
    "faq.subtitle": "Find answers to commonly asked questions",

    // Testimonials
    "testimonials.title": "Pilgrim Testimonials",
    "testimonials.subtitle": "Our pilgrims' experiences",

    // CTA
    "cta.title": "Ready for Umrah?",
    "cta.subtitle": "Register now and make your dream come true",
    "cta.button": "Register Now",

    // Footer
    "footer.rights": "All rights reserved",

    // Gallery
    "gallery.title": "Photo Gallery",
    "gallery.subtitle": "Beautiful moments of our pilgrims' journey",

    // Blog
    "blog.title": "Blog & Articles",
    "blog.read_more": "Read More",

    // Booking
    "booking.title": "Booking Form",
    "booking.room_selection": "Room Selection",
    "booking.pilgrim_data": "Pilgrim Data",
    "booking.confirmation": "PIC & Confirmation",
    "booking.total": "Total Price",
    "booking.submit": "Confirm Booking",
    "booking.success": "Booking successful!",

    // Auth
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Full Name",
    "auth.forgot_password": "Forgot password?",

    // Dashboard
    "dashboard.my_bookings": "My Bookings",
    "dashboard.profile": "Profile",
    "dashboard.payments": "Payments",

    // Admin common
    "admin.save": "Save",
    "admin.cancel": "Cancel",
    "admin.delete": "Delete",
    "admin.edit": "Edit",
    "admin.add": "Add",
    "admin.search": "Search...",
    "admin.export_csv": "Export CSV",
    "admin.actions": "Actions",
    "admin.status": "Status",
    "admin.loading": "Loading...",
    "admin.no_data": "No data yet",
    "admin.confirm_delete": "Are you sure you want to delete?",

    // Admin sidebar
    "admin.dashboard": "Dashboard",
    "admin.bookings": "Bookings",
    "admin.packages_menu": "Packages",
    "admin.departures": "Departures",
    "admin.pilgrims": "Pilgrims",
    "admin.payments_menu": "Payments",
    "admin.agents": "Agents",
    "admin.branches": "Branches",
    "admin.users": "Users",
    "admin.settings": "Settings",
    "admin.reports": "Reports",
    "admin.crm": "CRM",
    "admin.analytics": "AI Analytics",
    "admin.multi_branch": "Multi-Branch",
    "admin.accounting": "Accounting",

    // Common
    "common.all": "All",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.yes": "Yes",
    "common.no": "No",
    "common.close": "Close",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.showing": "Showing",
    "common.of": "of",
    "common.language": "Language",
  },
};
