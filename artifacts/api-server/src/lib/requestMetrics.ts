import type { RequestHandler } from "express";

const WINDOW_MS = 15 * 60 * 1000; // keep last 15 minutes of samples

interface Sample {
  timestamp: number;
  isError: boolean;
}

let samples: Sample[] = [];

function prune(now: number) {
  const cutoff = now - WINDOW_MS;
  while (samples.length > 0 && samples[0].timestamp < cutoff) {
    samples.shift();
  }
}

export const requestMetrics: RequestHandler = (req, res, next) => {
  res.on("finish", () => {
    const now = Date.now();
    samples.push({ timestamp: now, isError: res.statusCode >= 500 });
    prune(now);
  });
  next();
};

export function getRequestMetrics() {
  const now = Date.now();
  prune(now);

  const total = samples.length;
  const errors = samples.filter((s) => s.isError).length;
  const errorRate = total > 0 ? errors / total : 0;

  return {
    windowMinutes: WINDOW_MS / 60000,
    totalRequests: total,
    errorRequests: errors,
    errorRate: Math.round(errorRate * 10000) / 100, // percent, 2 decimals
  };
}
