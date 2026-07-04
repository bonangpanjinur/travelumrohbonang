#!/usr/bin/env node
/**
 * Verifikasi environment variables sebelum deploy ke Vercel.
 * Jalankan: node scripts/verify-deploy-env.mjs
 *
 * Script ini TIDAK membaca file .env — ia membaca environment
 * variable yang benar-benar sudah di-set di proses yang menjalankannya.
 * Untuk cek env Vercel, jalankan lewat `vercel env pull` dulu, atau
 * jalankan `vercel build` yang otomatis inject env production.
 */

const REQUIRED = [
  {
    key: "DATABASE_URL",
    hint: "Connection string Supabase Postgres (mode Transaction, port 6543). Supabase Dashboard → Project Settings → Database → Connection string → URI",
  },
  {
    key: "SUPABASE_URL",
    hint: "Supabase Dashboard → Project Settings → API → Project URL",
  },
  {
    key: "SUPABASE_ANON_KEY",
    hint: "Supabase Dashboard → Project Settings → API → anon public key",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    hint: "Supabase Dashboard → Project Settings → API → service_role key (JANGAN pernah expose ke frontend)",
  },
  {
    key: "VITE_SUPABASE_URL",
    hint: "Sama dengan SUPABASE_URL, tapi dengan prefix VITE_ agar terbaca di frontend",
  },
  {
    key: "VITE_SUPABASE_ANON_KEY",
    hint: "Sama dengan SUPABASE_ANON_KEY, dengan prefix VITE_",
  },
  {
    key: "VITE_SUPABASE_PUBLISHABLE_KEY",
    hint: "Nilainya sama dengan VITE_SUPABASE_ANON_KEY",
  },
  {
    key: "VITE_SUPABASE_PROJECT_ID",
    hint: "Subdomain dari URL Supabase, contoh 'abcdef' dari https://abcdef.supabase.co",
  },
  {
    key: "REPL_ID",
    hint: "Diperlukan untuk login (Replit OIDC). Salin dari Replit → tab Secrets project ini",
  },
];

const OPTIONAL = [
  { key: "ISSUER_URL", hint: "Default: https://replit.com/oidc — hanya isi jika pakai provider OIDC lain" },
  { key: "VITE_API_URL", hint: "Kosongkan di Vercel (frontend & API satu domain)" },
  { key: "VITE_SENTRY_DSN", hint: "Opsional — error monitoring" },
  { key: "VITE_TURNSTILE_SITE_KEY", hint: "Opsional — CAPTCHA" },
  { key: "LOG_LEVEL", hint: "Opsional — default 'info'" },
];

function mask(value) {
  if (!value) return "";
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function checkGroup(title, list, { required }) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  let missing = [];
  for (const { key, hint } of list) {
    const value = process.env[key];
    if (value) {
      console.log(`  \u2705 ${key} = ${mask(value)}`);
    } else {
      console.log(`  ${required ? "\u274c" : "\u26a0\ufe0f "} ${key} — BELUM DI-SET`);
      console.log(`     ${hint}`);
      if (required) missing.push(key);
    }
  }
  return missing;
}

console.log("Verifikasi Environment Variables — Deploy ke Vercel");
console.log("=".repeat(52));

const missingRequired = checkGroup("Wajib (required)", REQUIRED, { required: true });
checkGroup("Opsional (optional)", OPTIONAL, { required: false });

console.log("\n" + "=".repeat(52));
if (missingRequired.length > 0) {
  console.log(`\u274c Tidak lengkap. ${missingRequired.length} variabel wajib belum di-set:`);
  for (const key of missingRequired) console.log(`   - ${key}`);
  console.log("\nTambahkan semua variabel di atas di Vercel: Project Settings → Environment Variables,");
  console.log("lalu jalankan ulang script ini via `vercel env pull .env.vercel && node -r dotenv/config scripts/verify-deploy-env.mjs dotenv_config_path=.env.vercel`");
  process.exit(1);
} else {
  console.log("\u2705 Semua environment variable wajib sudah lengkap. Aman untuk deploy ke Vercel.");
  process.exit(0);
}
