---
name: Express 5 async handler return pattern
description: How to write early exits in Express 5 async route handlers to satisfy TypeScript strict mode
---

In Express 5 with TypeScript strict mode (`noImplicitReturns`), async handlers must have explicit returns on all code paths.

**Rule:** Use `{ res.status(X).json(Y); return; }` for early exits — NOT `return res.status(X).json(Y)`.

**Why:** `return res.status(X).json(Y)` returns a `Response` object, but the handler is typed `async (req, res) => void`. Mixing `return Response` and implicit `return undefined` at the end triggers TS7030 "not all code paths return a value". The `{ ...; return; }` pattern makes all paths return `undefined` consistently.

**How to apply:** Any Express route handler that has conditional early exits (404, 400 responses) needs this pattern at every early-exit point. The final response at the end can use `return res.json(data)` or just `res.json(data)` — both work for the last statement.
