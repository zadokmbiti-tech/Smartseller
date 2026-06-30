---
name: Orval generated hook parameter order
description: Generated React Query hooks take (params, options) — subagents often pass query options as first arg instead of second
---

**Rule:** Orval-generated hooks have signature `useHookName(params?, options?)` where `options` is `{ query?: UseQueryOptions, request?: ... }`. The `params` arg is the API query parameters (filters, pagination, etc.).

**Why:** Subagents frequently make the mistake of passing `{ query: { queryKey: [...] } }` as the first argument (treating it as params), when it should be the second argument. This causes TypeScript error TS2353 "Object literal may only specify known properties, and 'query' does not exist in type 'XParams'".

**How to apply:**
- Correct: `useListProducts({ categoryId: 1 }, { query: { enabled: !!id } })`
- Correct: `useGetAnalyticsOverview()` (no args if no filters needed)
- Wrong: `useListProducts({ query: { queryKey: [...] } })` — this passes query options as params

Also note: period enums like `GetTopProductsPeriod` and `GetPaymentBreakdownPeriod` may not include "today" — check the generated enum values before using a period string.
