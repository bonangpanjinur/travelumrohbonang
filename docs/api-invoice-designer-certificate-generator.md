# Dokumentasi API Frontend

## Invoice Designer dan Advanced Certificate Generator

**Versi:** 1.0  
**Repository:** `bonangpanjinur/travelumrohbonang`  
**Audience:** Tim frontend, QA, dan integrator admin panel

Dokumen ini menjelaskan endpoint yang digunakan frontend untuk mengatur desain invoice, menghasilkan data invoice, mengelola template sertifikat, memilih booking/jemaah, dan menerbitkan sertifikat. Kontrak di bawah mengikuti implementasi route saat ini pada repository.

> **Catatan umum:** seluruh endpoint `/api/admin/*` membutuhkan session/authentication yang valid. Endpoint invoice template membutuhkan role admin penuh, endpoint invoice-data membutuhkan role operasional, sedangkan endpoint certificate membutuhkan role operasional.[^1] [^2] [^3]

## 1. Konvensi Request

Frontend menggunakan helper `apiFetch`, sehingga request JSON sebaiknya mengirim header `Content-Type: application/json`. Response sukses berbentuk `{ data: ... }` untuk endpoint settings/certificate selector, sedangkan invoice-data mengembalikan object invoice secara langsung.

| Status | Makna umum | Format error |
|---|---|---|
| `200` | Request berhasil | `{ data: ... }` atau object invoice |
| `201` | Resource berhasil dibuat | `{ data: ... }` |
| `400` | Payload tidak valid | `{ error: string }` |
| `401` | Belum login | `{ error: string }` |
| `403` | Role atau scope tidak diizinkan | `{ error: string }` |
| `404` | Resource tidak ditemukan | `{ error: string }` |
| `500` | Kesalahan server/infrastruktur | `{ error: string }` |

Frontend harus menampilkan `error` kepada pengguna dengan pesan yang aman dan tidak mengandalkan bentuk internal exception.

# 2. Invoice Designer

## 2.1 Otorisasi dan route

Invoice Designer dipasang pada `admin settings` dan digunakan untuk konfigurasi global invoice.

| Method | Endpoint | Akses | Tujuan |
|---|---|---|---|
| `GET` | `/api/admin/settings/invoice-template` | `requireAdmin` | Membaca konfigurasi invoice aktif |
| `PUT` | `/api/admin/settings/invoice-template` | `requireAdmin` | Menyimpan konfigurasi invoice |

## 2.2 GET invoice template

```http
GET /api/admin/settings/invoice-template
```

### Response ketika setting belum pernah disimpan

```json
{
  "data": {
    "key": "invoice_template",
    "category": "documents",
    "value": {
      "templateKey": "emerald-classic",
      "paper": "A4",
      "orientation": "portrait",
      "primaryColor": "#0d6b4e",
      "accentColor": "#b88a2a",
      "fontFamily": "Inter",
      "borderStyle": "solid",
      "showLogo": true,
      "showQr": true,
      "showCompanyAddress": true,
      "showCustomerPhone": true,
      "showRoomBreakdown": true,
      "showPilgrims": true,
      "showPaymentHistory": true,
      "showPaymentPolicy": true,
      "showPaymentSchedule": true,
      "footerText": "Invoice ini dihasilkan secara otomatis oleh sistem."
    }
  }
}
```

Jika setting sudah ada, response memiliki bentuk yang sama, tetapi `value` berisi konfigurasi terakhir yang disimpan.

## 2.3 PUT invoice template

```http
PUT /api/admin/settings/invoice-template
Content-Type: application/json
```

Frontend dapat mengirim object konfigurasi di dalam property `value`:

```json
{
  "value": {
    "templateKey": "gold-premium",
    "paper": "A4",
    "orientation": "portrait",
    "primaryColor": "#33251b",
    "accentColor": "#d4af37",
    "fontFamily": "Georgia",
    "borderStyle": "double",
    "showLogo": true,
    "showQr": true,
    "showCompanyAddress": true,
    "showCustomerPhone": false,
    "showRoomBreakdown": true,
    "showPilgrims": false,
    "showPaymentHistory": true,
    "showPaymentPolicy": true,
    "showPaymentSchedule": true,
    "footerText": "Mohon lakukan pembayaran sesuai jadwal yang tercantum."
  }
}
```

Backend akan melakukan sanitasi dan normalisasi. Nilai yang tidak termasuk allowlist akan diganti dengan default yang aman.

### Allowlist field

| Field | Tipe | Nilai yang diizinkan |
|---|---|---|
| `templateKey` | string | `emerald-classic`, `gold-premium`, `minimal-slate`, `ramadan-night` |
| `paper` | string | `A4`, `Letter` |
| `orientation` | string | `portrait`, `landscape` |
| `primaryColor` | string | Hex enam digit, contoh `#0d6b4e` |
| `accentColor` | string | Hex enam digit |
| `fontFamily` | string | `Inter`, `Arial`, `Georgia`, `Noto Sans` |
| `borderStyle` | string | `none`, `solid`, `double` |
| `showLogo` | boolean | `true` atau `false` |
| `showQr` | boolean | `true` atau `false` |
| `showCompanyAddress` | boolean | `true` atau `false` |
| `showCustomerPhone` | boolean | `true` atau `false` |
| `showRoomBreakdown` | boolean | `true` atau `false` |
| `showPilgrims` | boolean | `true` atau `false` |
| `showPaymentHistory` | boolean | `true` atau `false` |
| `showPaymentPolicy` | boolean | `true` atau `false` |
| `showPaymentSchedule` | boolean | `true` atau `false` |
| `footerText` | string | Maksimal 500 karakter |

### Contoh penggunaan frontend

```ts
const response = await apiFetch<{ data: { value: InvoiceTemplateSettings } }>(
  "/api/admin/settings/invoice-template",
);

const current = response.data.value;

await apiFetch("/api/admin/settings/invoice-template", {
  method: "PUT",
  body: JSON.stringify({
    value: {
      ...current,
      templateKey: "minimal-slate",
      primaryColor: "#334155",
      showPaymentSchedule: true,
    },
  }),
});
```

## 2.4 Mengambil data invoice booking

```http
GET /api/admin/bookings/:bookingId/invoice-data
```

Endpoint ini membutuhkan role operasional dan pemeriksaan scope booking. Parameter dapat berupa UUID booking atau booking code, bergantung pada data yang tersedia pada route.

### Response utama

```json
{
  "invoiceNumber": "INV/2026/0042",
  "bookingCode": "UMR-2026-0001",
  "customerName": "Nama Jemaah",
  "customerEmail": "jemaah@example.com",
  "customerPhone": "+628120000000",
  "packageTitle": "Paket Umroh Reguler",
  "departureDate": "2026-10-20",
  "totalPrice": 35000000,
  "createdAt": "2026-08-28T08:00:00.000Z",
  "status": "waiting_payment",
  "paymentPolicySnapshot": {
    "rules": [
      {
        "ruleCode": "REFUND_DEADLINE",
        "displayText": "Pembatalan mengikuti ketentuan travel."
      }
    ]
  },
  "paymentScheduleSnapshot": [
    {
      "sequence": 1,
      "code": "down_payment",
      "label": "DP",
      "percentage": 30,
      "amount": 10500000,
      "dueDate": "2026-09-01",
      "status": "pending"
    }
  ],
  "invoicePreferences": {
    "digital": true,
    "email": true,
    "whatsapp": false,
    "includePaymentPolicy": true,
    "includePaymentSchedule": true,
    "includePilgrims": true
  },
  "pilgrims": [],
  "rooms": [
    {
      "room_type": "quad",
      "quantity": 2,
      "price": 17500000,
      "subtotal": 35000000
    }
  ],
  "payments": [],
  "companyName": "Vins Tour Travel",
  "companyTagline": "Travel & Tours",
  "logoUrl": "https://cdn.example.com/logo.png"
}
```

Frontend dapat menggabungkan response ini dengan konfigurasi dari endpoint invoice template sebelum memanggil generator HTML. Pada implementasi saat ini, `fetchInvoiceData` sudah melakukan pengambilan keduanya secara paralel.

# 3. Advanced Certificate Generator

## 3.1 Otorisasi dan route

| Method | Endpoint | Akses | Tujuan |
|---|---|---|---|
| `GET` | `/api/admin/certificates/selector/packages` | Operasional | Daftar paket yang memiliki booking dalam scope |
| `GET` | `/api/admin/certificates/selector/departures` | Operasional | Daftar departure terfilter |
| `GET` | `/api/admin/certificates/selector/bookings` | Operasional | Daftar booking terfilter |
| `GET` | `/api/admin/certificates/selector/bookings/:bookingId/pilgrims` | Operasional + scope | Daftar jemaah dari booking tertentu |
| `GET` | `/api/admin/certificates/templates` | Operasional + scope | Daftar template sertifikat |
| `POST` | `/api/admin/certificates/templates` | Operasional | Membuat template |
| `PATCH` | `/api/admin/certificates/templates/:id` | Operasional + scope | Memperbarui template |
| `GET` | `/api/admin/certificates/booking/:bookingId` | Operasional + scope | Melihat sertifikat booking |
| `POST` | `/api/admin/certificates/booking/:bookingId/pilgrim/:pilgrimId/issue` | Operasional + scope | Menerbitkan sertifikat |

## 3.2 Selector bertahap

### Daftar paket

```http
GET /api/admin/certificates/selector/packages
```

Response:

```json
{
  "data": [
    { "id": "package-uuid", "title": "Umroh Reguler" }
  ]
}
```

### Daftar departure

```http
GET /api/admin/certificates/selector/departures?packageId=package-uuid&month=2026-10
```

Kedua query parameter bersifat opsional. Response:

```json
{
  "data": [
    {
      "id": "departure-uuid",
      "departureDate": "2026-10-20",
      "packageId": "package-uuid",
      "packageTitle": "Umroh Reguler"
    }
  ]
}
```

### Daftar booking

```http
GET /api/admin/certificates/selector/bookings?packageId=package-uuid&departureId=departure-uuid&search=UMR-2026
```

Response maksimum 100 booking:

```json
{
  "data": [
    {
      "id": "booking-uuid",
      "departureId": "departure-uuid",
      "packageId": "package-uuid",
      "bookingCode": "UMR-2026-0001",
      "status": "confirmed",
      "packageTitle": "Umroh Reguler",
      "departureDate": "2026-10-20"
    }
  ]
}
```

### Daftar jemaah

```http
GET /api/admin/certificates/selector/bookings/booking-uuid/pilgrims
```

Response:

```json
{
  "data": [
    {
      "id": "pilgrim-uuid",
      "name": "Nama Jemaah",
      "gender": "P",
      "passportNumber": "X1234567"
    }
  ]
}
```

## 3.3 Template sertifikat

### GET template

```http
GET /api/admin/certificates/templates?type=umroh
```

`type` dapat berupa `umroh` atau `badal_umroh`. Tanpa `type`, endpoint mengembalikan semua template yang berada dalam scope pengguna.

### POST template

```http
POST /api/admin/certificates/templates
Content-Type: application/json
```

Request:

```json
{
  "name": "Sertifikat Premium 2026",
  "certificateType": "umroh",
  "design": {
    "layout": "premium",
    "accent": "#d4af37",
    "recipientColor": "#431407",
    "backgroundColor": "#fff7ed",
    "title": "SERTIFIKAT EKSKLUSIF {TYPE}",
    "subtitle": "Diberikan kepada",
    "body": "Dengan ini menerangkan bahwa",
    "footer": "Semoga menjadi amal ibadah yang diterima Allah SWT.",
    "recipientSize": 42,
    "borderWidth": 12,
    "borderRadius": 12,
    "watermarkText": "BARAKALLAH",
    "showLogo": true,
    "showAddress": true,
    "showAdditionalLogo": false,
    "additionalLogoUrl": "",
    "showCertificateNumber": true,
    "showIssueDate": true,
    "signatureName": "Direktur Utama",
    "signatureTitle": "Pimpinan Travel",
    "sealText": "RESMI"
  }
}
```

`certificateType` akan dinormalisasi menjadi `umroh` atau `badal_umroh`. `design` disanitasi backend sebelum disimpan.

### PATCH template

```http
PATCH /api/admin/certificates/templates/template-uuid
Content-Type: application/json
```

Request dapat parsial:

```json
{
  "name": "Sertifikat Premium Revisi",
  "design": {
    "accent": "#166534",
    "watermarkText": "UMROH 2026",
    "showIssueDate": true
  }
}
```

Frontend sebaiknya mengirim seluruh design object ketika melakukan save dari editor agar nilai yang tidak terlihat pada form tidak hilang. Jika hanya mengirim `design` parsial, backend menyimpan hasil sanitasi dari payload tersebut dengan default untuk field yang tidak dikirim.

## 3.4 Field advanced design

| Field | Tipe | Keterangan |
|---|---|---|
| `layout` | string | `elegant`, `classic`, `modern`, atau `premium` |
| `accent` | hex string | Warna aksen dan bingkai |
| `recipientColor` | hex string | Warna nama penerima |
| `backgroundColor` | hex string | Warna latar sertifikat |
| `title` | string | Judul; `{TYPE}` diganti menjadi UMROH/BADAL UMROH di frontend |
| `subtitle` | string | Subjudul |
| `body` | string | Kalimat pembuka |
| `footer` | string | Maksimal 500 karakter |
| `recipientSize` | number | 24–72 px |
| `borderWidth` | number | 0–30 px |
| `borderRadius` | number | 0–40 px |
| `watermarkText` | string | Maksimal 80 karakter |
| `showLogo` | boolean | Logo utama travel |
| `showAddress` | boolean | Alamat perusahaan |
| `showAdditionalLogo` | boolean | Logo partner/sponsor |
| `additionalLogoUrl` | string | Hanya HTTPS atau data image png/jpeg/webp |
| `showCertificateNumber` | boolean | Nomor sertifikat |
| `showIssueDate` | boolean | Tanggal terbit |
| `signatureName` | string | Maksimal 120 karakter |
| `signatureTitle` | string | Maksimal 120 karakter |
| `sealText` | string | Teks stempel/seal, maksimal 40 karakter |

Preset frontend yang tersedia pada editor adalah `elegant`, `classic`, `modern`, `premium`, `sahaba`, dan `minimal`. Dua preset terakhir memakai layout yang sama dengan layout backend yang diizinkan, tetapi memiliki kombinasi warna dan copywriting berbeda.

## 3.5 Menerbitkan sertifikat

```http
POST /api/admin/certificates/booking/:bookingId/pilgrim/:pilgrimId/issue
Content-Type: application/json
```

Request Umroh:

```json
{
  "certificateType": "umroh",
  "templateId": "template-uuid",
  "packageTitle": "Umroh Reguler",
  "design": {
    "layout": "elegant",
    "accent": "#123f35",
    "title": "SERTIFIKAT {TYPE}",
    "showCertificateNumber": true,
    "showIssueDate": true,
    "signatureName": "Direktur Utama"
  }
}
```

Request Badal Umroh menambahkan `performerName`:

```json
{
  "certificateType": "badal_umroh",
  "templateId": "template-uuid",
  "performerName": "Ahmad Fauzan",
  "packageTitle": "Badal Umroh",
  "design": {
    "layout": "premium",
    "accent": "#d4af37",
    "watermarkText": "BADAL UMROH"
  }
}
```

Response sukses:

```json
{
  "data": {
    "id": "certificate-uuid",
    "branchId": "branch-uuid",
    "templateId": "template-uuid",
    "bookingId": "booking-uuid",
    "pilgrimId": "pilgrim-uuid",
    "certificateType": "umroh",
    "certificateNumber": "UMR-2026-A1B2C3D4",
    "recipientName": "Nama Jemaah",
    "performerName": null,
    "issuedAt": "2026-08-28T09:00:00.000Z",
    "payload": {
      "bookingCode": "UMR-2026-0001",
      "packageTitle": "Umroh Reguler",
      "design": {}
    },
    "createdBy": "user-uuid"
  }
}
```

Backend selalu memeriksa bahwa booking berada dalam scope user, pilgrim merupakan bagian dari booking tersebut, dan template berada dalam scope yang diizinkan. Frontend tidak boleh menganggap `pilgrimId` yang dipilih dari UI sebagai bukti ownership; validasi server tetap menjadi sumber kebenaran.

## 3.6 Daftar sertifikat booking

```http
GET /api/admin/certificates/booking/booking-uuid
```

Response:

```json
{
  "data": [
    {
      "id": "certificate-uuid",
      "certificateNumber": "UMR-2026-A1B2C3D4",
      "certificateType": "umroh",
      "recipientName": "Nama Jemaah",
      "issuedAt": "2026-08-28T09:00:00.000Z"
    }
  ]
}
```

# 4. Pola integrasi frontend yang disarankan

Alur Invoice Designer sebaiknya memuat setting pada mount halaman, menggabungkan perubahan lokal pada state editor, menampilkan preview menggunakan state lokal, lalu menyimpan dengan `PUT` saat tombol simpan ditekan. Setelah save berhasil, frontend sebaiknya mengganti state dengan response server agar nilai hasil sanitasi backend ikut tercermin.

Alur Certificate Generator sebaiknya menggunakan selector bertahap: paket → departure → booking → pilgrim. Saat filter berubah, state child selector harus di-reset agar ID lama tidak ikut terkirim. Sebelum issue, frontend perlu memvalidasi `bookingId`, `pilgrimId`, dan `certificateType`, tetapi tetap memperlakukan validasi backend sebagai otoritatif.

Untuk retry request, frontend hanya boleh mengulang `GET` secara otomatis. `POST` issue certificate dan `PUT/PATCH` save template sebaiknya menggunakan tombol retry eksplisit agar tidak membuat duplikasi template atau sertifikat secara tidak sengaja. Jika diperlukan idempotensi issue di masa depan, backend perlu menambahkan idempotency key.

# 5. Keamanan dan privacy

Jangan mengirim token, secret gateway, atau data administrasi internal ke komponen preview. Data passport hanya diperlukan pada selector pilgrim dan tidak boleh dimasukkan ke payload desain. URL asset sebaiknya HTTPS; backend saat ini menolak URL non-HTTPS dan tipe data image yang tidak diizinkan. Konten teks template harus dianggap untrusted ketika dirender ke HTML invoice atau dokumen, sehingga implementasi renderer perlu melakukan HTML escaping terhadap nama pelanggan, nama paket, alamat, footer, dan rule pembayaran.

Scope branch harus dipertahankan pada semua operasi certificate. Jika API mengembalikan `403`, frontend menampilkan pesan akses ditolak dan tidak mencoba mengganti `branchId` secara manual. Untuk `404` pada template, frontend harus menghapus pilihan template yang sudah tidak tersedia dari state editor.

# 6. Source references

[^1]: [`artifacts/api-server/src/routes/admin/settings.ts`](../artifacts/api-server/src/routes/admin/settings.ts) — endpoint invoice template dan sanitizer konfigurasi.
[^2]: [`artifacts/api-server/src/routes/admin/certificates.ts`](../artifacts/api-server/src/routes/admin/certificates.ts) — selector, template, issue certificate, scope, dan sanitizer design.
[^3]: [`artifacts/api-server/src/routes/admin/index.ts`](../artifacts/api-server/src/routes/admin/index.ts) — mount middleware role untuk settings, bookings, dan certificates.
[^4]: [`artifacts/api-server/src/routes/admin/bookings.ts`](../artifacts/api-server/src/routes/admin/bookings.ts) — endpoint invoice-data dan response invoice.
[^5]: [`artifacts/umroh-app/src/features/admin/pages/InvoiceDesigner.tsx`](../artifacts/umroh-app/src/features/admin/pages/InvoiceDesigner.tsx) — state editor, preset, live preview, dan pemanggilan API invoice template.
[^6]: [`artifacts/umroh-app/src/features/admin/pages/CertificateGenerator.tsx`](../artifacts/umroh-app/src/features/admin/pages/CertificateGenerator.tsx) — preset advanced, selector bertahap, preview, save template, dan issue flow.
[^7]: [`artifacts/umroh-app/src/features/admin/components/InvoiceGenerator.ts`](../artifacts/umroh-app/src/features/admin/components/InvoiceGenerator.ts) — integrasi invoice-data, template settings, dan HTML invoice renderer.
