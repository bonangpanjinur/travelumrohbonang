---
name: react-pdf in esbuild-bundled Node servers
description: Runtime crash when bundling @react-pdf/renderer with esbuild in a pnpm-workspace api-server, and how to avoid it.
---

Adding `@react-pdf/renderer` to a hand-rolled esbuild-bundled Express server (the
`artifacts/api-server` pattern in this workspace) produces a clean typecheck and
build, but the bundled server crashes on boot with
`ERR_MODULE_NOT_FOUND: Cannot find package '@swc/helpers'` — because esbuild only
bundles code, it doesn't vendor transitive runtime deps that some sub-dependency
resolves dynamically at import time.

**Why:** `@react-pdf/renderer`'s dependency chain pulls in `@swc/helpers` (and
needs `react` itself as a peer, even in a backend-only project) at runtime, not
just build time. esbuild bundles the require graph it can statically see, but a
package that resolves `@swc/helpers` via its own `package.json`/dynamic path
still needs the package physically present in `node_modules` for Node's ESM
resolver to find it after bundling.

**How to apply:** when adding `@react-pdf/renderer` (or similar) to an
esbuild-bundled Node service, explicitly install `react`, `@types/react`, and
`@swc/helpers` as direct dependencies even though nothing in your own code
imports them by name. Verify by fully restarting the workflow (not just
typecheck) — the build step alone won't catch this class of failure.
