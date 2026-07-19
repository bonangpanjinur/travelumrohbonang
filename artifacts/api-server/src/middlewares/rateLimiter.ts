import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV === "development";

// General limiter — semua route /api/* dan /rest/v1/*
// 500 req / 15 menit cukup untuk public traffic normal.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: "Too many requests, please try again later." },
});

// Strict limiter — admin panel + authenticated user routes.
// Admin dashboard memuat 20–40 endpoint sekaligus per halaman;
// limit 40 terlalu kecil. 500 per 15 menit masih jauh di bawah
// ambang abuse untuk user yang sudah terautentikasi.
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: "Too many requests, please try again later." },
});

// Write limiter — POST/PATCH/DELETE operasi yang mengubah data.
// Lebih longgar dari sebelumnya tapi tetap membatasi abuse.
export const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: "Too many requests, please try again later." },
});
