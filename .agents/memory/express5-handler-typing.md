---
name: Express 5 handler typing
description: How to correctly type Express 5 route handler parameters to avoid "Property 'json' does not exist on Response" errors on Vercel.
---

# Express 5 — Route Handler Typing Rule

## The Rule
Never explicitly annotate `req` and `res` parameters in Express 5 route handlers. Let TypeScript infer them from the router method.

**Wrong (causes TS2339 on Vercel):**
```typescript
import { Router, type Request, type Response } from "express";
router.get("/path", (req: Request, res: Response) => {
  res.json(data); // ERROR: Property 'json' does not exist
});
```

**Correct (TypeScript infers correctly):**
```typescript
import { Router } from "express";
router.get("/path", (req, res) => {
  res.json(data); // OK — inferred from router.get signature
});
```

**Why:**
`@types/express` v5 re-exports `Response` from `express-serve-static-core`. When you explicitly annotate `res: Response`, TypeScript uses the re-exported interface which may resolve `core.Response` from a different module path than what the `router.get()` overload uses — causing the interface extension to break down (private property mismatch, same pattern as dual drizzle-orm installs). When TypeScript *infers* the type from the router method, it uses a single consistent type path and all methods are present.

**How to apply:**
- Route handlers: no explicit `req`/`res` types — just `(req, res) =>` or `async (req, res) =>`
- For middleware that needs explicit types (e.g., `requireAuth`), use `Request, Response, NextFunction` — middleware signatures are fine because they aren't inferred through a router overload
- If a param value needs to be narrowed (e.g., `req.params.id` as `string`), do it inline with `as string` inside the handler body

**Applies to this project:**
Stack is Express 5 + `@types/express@^5.0.6` + TypeScript 5.9 + Vercel serverless deployment.
