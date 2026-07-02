---
name: Vercel API tsconfig typeRoots + explicit handler typing
description: The only reliable fix for TS7006 on Vercel is explicit Request/Response annotations on every handler. typeRoots alone is insufficient for transitively-compiled files.
---

## Rule
**Always annotate Express route handler parameters explicitly.** Do NOT rely on TypeScript's inference from the Router method.

In every route file:
```typescript
import { Router, Request, Response } from "express";

router.get("/path", async (req: Request, res: Response) => { ... });
router.get("/path", (_req: Request, res: Response) => { ... });
```

**Why:** When Vercel compiles the API serverless function, files in `artifacts/api-server/src/` are compiled transitively. TypeScript uses `api/tsconfig.json` as the root context but may not apply its `typeRoots` to transitively included files the same way. The result is that Express types are unavailable for inference, causing TS7006 on every `(req, res)` callback parameter — even though local build passes (because local build uses `artifacts/api-server/tsconfig.json` directly). Explicit `import { Request, Response } from "express"` uses **module resolution** (not typeRoots), which always works as long as express is in node_modules.

**How to apply:** Any new route file must import `Request, Response` from `express` and annotate all handler params. Run `pnpm typecheck` from root before push.

## tsconfig belt-and-suspenders (keep, but not sufficient alone)
Both `api/tsconfig.json` and `artifacts/api-server/tsconfig.json` should still have:
```json
"typeRoots": [".../@types", ".../node_modules/@types"],
"types": ["node", "express"]
```

## Null-safety in route handlers
Drizzle schema columns may be `string | null`. When using column values as Record keys or array indices, always guard: `if (!p.departureId) return acc;` before `acc[p.departureId]`.
