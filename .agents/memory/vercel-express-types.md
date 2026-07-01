---
name: Vercel @vercel/node Express type annotations
description: Explicit Express/IRouter type annotations break under @vercel/node even with moduleResolution Bundler — always infer instead.
---

# Rule
Never annotate Express objects with explicit `Express` or `IRouter` types from `@types/express` v5. Always let TypeScript infer from the factory call.

**Bad:**
```ts
const app: Express = express();
const router: IRouter = Router();
```

**Good:**
```ts
const app = express();
const router = Router();
```

**Why:** `@vercel/node` v5's type resolution resolves `Express` as the factory/namespace type and `IRouter` as a base interface — neither carries `.use()` in this context. TypeScript infers the concrete `Application` / `Router` type from the factory calls, which does have all middleware methods.

**How to apply:** Any time a new route file or app file is created in `artifacts/api-server/src/`, never add explicit Express type annotations on the `app` or `router` variables. Also applies to the `api/tsconfig.json` (which overrides Vercel's default `node16` moduleResolution with `Bundler` — keep it).
