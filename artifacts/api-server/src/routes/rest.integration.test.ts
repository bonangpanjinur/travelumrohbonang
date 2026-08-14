import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

/**
 * Black-box smoke tests against the real Express app (no mocked auth) —
 * covers the security boundaries that matter most: public tables stay
 * public, AUTH_TABLES require a token, and unknown tables are rejected.
 */
describe("GET /rest/v1/:table", () => {
  it("allows unauthenticated reads on a public table when dependencies are ready", async () => {
    const res = await request(app).get("/rest/v1/packages?limit=1");
    expect([200, 503]).toContain(res.status);
    if (res.status === 503) {
      expect(res.body).toHaveProperty("error");
    }
  });

  it("rejects unauthenticated reads on an AUTH_TABLE (e.g. bookings)", async () => {
    const res = await request(app).get("/rest/v1/bookings?limit=1");
    expect(res.status).toBe(401);
  });

  it("rejects an unknown table name", async () => {
    const res = await request(app).get("/rest/v1/not_a_real_table");
    expect(res.status).toBe(400);
  });
});

describe("PATCH/DELETE /rest/v1/:table", () => {
  it("requires auth before it even checks for a filter", async () => {
    const res = await request(app).patch("/rest/v1/bookings");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/health", () => {
  it("reports process liveness independently of database readiness", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });

  it("reports dependency readiness with an explicit status", async () => {
    const res = await request(app).get("/api/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("server", "running");
  });
});
