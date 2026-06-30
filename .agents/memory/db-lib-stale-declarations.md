---
name: DB lib stale TypeScript declarations
description: After adding new schema files to lib/db, run typecheck:libs to rebuild declarations before leaf package typechecks
---

**Rule:** After modifying or adding files to `lib/db/src/schema/`, always run `pnpm run typecheck:libs` before running `pnpm --filter @workspace/api-server run typecheck`.

**Why:** `lib/db` is a composite TypeScript lib. Leaf packages (api-server) import from it using the compiled declarations. If the declarations are stale (e.g., you added a new table file and exported it from index.ts), the leaf package typecheck sees "no exported member" errors that are false positives — the table IS defined, but the declaration file hasn't been rebuilt yet.

**How to apply:** The sequence when adding new tables:
1. Write schema file in `lib/db/src/schema/newTable.ts`
2. Export from `lib/db/src/schema/index.ts`
3. Run `pnpm run typecheck:libs` ← this step is critical
4. Now run api-server typecheck or routes
