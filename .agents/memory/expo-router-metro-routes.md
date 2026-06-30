---
name: Expo Router Metro route map build timing
description: Metro builds the route map at startup — new screen files added after startup require a workflow restart to be recognized
---

**Rule:** After adding new screen files to `artifacts/mobile/app/`, restart the `artifacts/mobile: expo` workflow so Metro re-scans and rebuilds the route map.

**Why:** Metro (the Expo bundler) discovers routes at startup by scanning the `app/` directory. Files added after Metro starts aren't automatically picked up as routes — Metro may hot-reload file *changes* but not new file *additions* to the route map. Symptom: `[Layout children]: No route named "X" exists in nested children` even though `X.tsx` exists.

**How to apply:** Use `restart_workflow("artifacts/mobile: expo")` after writing new screen files if the workflow was already running. This is especially important after delegating screen creation to a subagent that runs while the workflow is already up.
