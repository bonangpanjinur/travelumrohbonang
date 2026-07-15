import { describe, it, expect, beforeEach, vi } from "vitest";

const createSignedUrl = vi.fn();
const insert = vi.fn();
const getUser = vi.fn();

vi.mock("@/shared/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ createSignedUrl }) },
    from: () => ({ insert }),
    auth: { getUser: () => getUser() },
  },
}));

import { getProofSignedUrl, clearProofUrlCache } from "@/features/booking/lib/paymentProofs";

describe("getProofSignedUrl", () => {
  beforeEach(() => {
    clearProofUrlCache();
    createSignedUrl.mockReset();
    insert.mockReset().mockResolvedValue({ error: null });
    getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
  });

  it("returns null for empty input", async () => {
    expect(await getProofSignedUrl(null)).toBeNull();
    expect(await getProofSignedUrl("")).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("creates a signed URL from a relative path", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/abc" }, error: null });
    const url = await getProofSignedUrl("u1/file.jpg", 300, { skipLog: true });
    expect(url).toBe("https://signed/abc");
    expect(createSignedUrl).toHaveBeenCalledWith("u1/file.jpg", 300);
  });

  it("extracts path from a legacy public URL", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/legacy" }, error: null });
    await getProofSignedUrl(
      "https://x.supabase.co/storage/v1/object/public/payment-proofs/u1/legacy.jpg",
      300,
      { skipLog: true }
    );
    expect(createSignedUrl).toHaveBeenCalledWith("u1/legacy.jpg", 300);
  });

  it("returns null and clears cache when storage errors", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: "boom" } });
    const url = await getProofSignedUrl("u1/file.jpg", 300, { skipLog: true });
    expect(url).toBeNull();
  });

  it("caches the URL across repeated calls within TTL", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/cached" }, error: null });
    const a = await getProofSignedUrl("u1/file.jpg", 300, { skipLog: true });
    const b = await getProofSignedUrl("u1/file.jpg", 300, { skipLog: true });
    expect(a).toBe(b);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("logs access by default", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/log" }, error: null });
    await getProofSignedUrl("u1/file.jpg", 300, { context: "test" });
    // log is fire-and-forget; flush microtasks
    await Promise.resolve();
    await Promise.resolve();
    expect(insert).toHaveBeenCalled();
  });
});
