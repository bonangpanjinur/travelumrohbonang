import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV === "development";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: "Too many requests, please try again later." },
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: "Too many requests, please try again later." },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: "Too many requests, please try again later." },
});
