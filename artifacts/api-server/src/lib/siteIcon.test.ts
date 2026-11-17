import { describe, expect, it } from "vitest";
import { resolvePublicIconUrl, resolveSiteIconUrl } from "./siteIcon";

describe("site icon URL resolution", () => {
  it("uses the explicit favicon when configured", () => {
    expect(resolveSiteIconUrl({
      favicon_url: "https://cdn.example.com/app-icon.png",
      logo_url: "https://cdn.example.com/logo.png",
    })).toBe("https://cdn.example.com/app-icon.png");
  });

  it("follows the current logo when no custom favicon is configured", () => {
    expect(resolveSiteIconUrl({
      favicon_url: "",
      logo_url: "https://cdn.example.com/current-logo.png",
    })).toBe("https://cdn.example.com/current-logo.png");
  });

  it("returns null when neither icon nor logo is usable", () => {
    expect(resolveSiteIconUrl({ favicon_url: "javascript:alert(1)", logo_url: "//evil.example/icon.png" })).toBeNull();
  });

  it("allows safe root-relative icon paths and rejects protocol-relative paths", () => {
    expect(resolvePublicIconUrl("/uploads/app-icon.png")).toBe("/uploads/app-icon.png");
    expect(resolvePublicIconUrl("//evil.example/icon.png")).toBeNull();
  });

  it("accepts only HTTP and HTTPS absolute URLs", () => {
    expect(resolvePublicIconUrl("https://cdn.example.com/icon.png")).toBe("https://cdn.example.com/icon.png");
    expect(resolvePublicIconUrl("data:image/png;base64,AAAA")).toBeNull();
  });
});
