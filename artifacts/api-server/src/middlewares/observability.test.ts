import { describe, expect, it, vi } from "vitest";
import { observabilityMiddleware, sanitizeLogPayload } from "./observability";

describe("observability", () => {
  it("redacts credential-like keys recursively", () => {
    expect(sanitizeLogPayload({
      authorization: "Bearer secret",
      password: "pw",
      nested: { access_token: "token", safe: "value" },
    })).toEqual({
      authorization: "[redacted]",
      password: "[redacted]",
      nested: { access_token: "[redacted]", safe: "value" },
    });
  });

  it("truncates deeply nested and oversized values", () => {
    expect(sanitizeLogPayload({ text: "x".repeat(3000) })).toEqual({ text: `${"x".repeat(2000)}…[truncated]` });
    expect(sanitizeLogPayload({ a: { b: { c: { d: { e: { f: "hidden" } } } } } })).toEqual({ a: { b: { c: { d: { e: "[truncated]" } } } } });
  });

  it("uses a valid inbound correlation ID and sets response header", () => {
    const req = { header: vi.fn((name: string) => name === "x-correlation-id" ? "corr-12345678" : undefined) } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();
    observabilityMiddleware(req, res, next);
    expect(req.correlationId).toBe("corr-12345678");
    expect(res.setHeader).toHaveBeenCalledWith("x-correlation-id", "corr-12345678");
    expect(next).toHaveBeenCalledOnce();
  });
});
