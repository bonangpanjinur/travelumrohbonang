import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentIdCardBackDecoration } from "./AgentIdCardBackDecoration";

describe("agent ID card back decoration", () => {
  it("keeps the bottom edge free of the removed diagonal decoration", () => {
    const markup = renderToStaticMarkup(<AgentIdCardBackDecoration />);

    expect(markup.match(/<polygon/g)).toHaveLength(1);
    expect(markup).toContain('points="0,0 42,0 0,16"');
    expect(markup).not.toContain("100,84 100,100 58,100");
  });
});