---
name: Drizzle ANY(ARRAY[]) empty array guard
description: Postgres rejects ANY(ARRAY[]) — always guard with arr.length > 0 before using sql.join() in WHERE clauses
---

**Rule:** Before using `sql\`... = ANY(ARRAY[${sql.join(arr.map(r => sql\`${r.id}\`), sql\`, \`)}])\``, always check `arr.length > 0`.

**Why:** Postgres throws a query error when given `= ANY(ARRAY[])` — an empty array is not valid in this context. This pattern commonly occurs when building dynamic WHERE clauses based on a fetched list (e.g., filtering sale_items by a list of sale IDs that could be empty when there's no data yet).

**How to apply:**
```ts
const items = arr.length > 0
  ? await db.select(...).where(sql\`col = ANY(ARRAY[${sql.join(arr.map(r => sql\`${r.id}\`), sql\`, \`)}])\`)
  : [];
```
This is especially important in analytics endpoints called on a fresh database with no sales.
