---
name: Re-registering artifacts after restoring files from a backup
description: What to do when artifact directories exist on disk (e.g. restored from a backup) but listArtifacts()/WorkflowsRestart don't know about them.
---

If real app code (with valid `.replit-artifact/artifact.toml` files) is copied onto disk from
an external source (e.g. a `.migration-backup/` folder) instead of being created through
`createArtifact`, the platform's artifact/workflow registry does NOT pick it up automatically —
`listArtifacts()` stays empty and `WorkflowsRestart` reports the workflow doesn't exist.

**Why:** the registry is populated by the `createArtifact` callback (and by `.replit`'s
`[agent].stack` triggering a scan), not by the mere presence of `artifact.toml` on disk.

**How to apply:**
1. Ensure `.replit`'s `[agent].stack` is `"PNPM_WORKSPACE"` (edit via a temp file +
   `verifyAndReplaceDotReplit`, never by direct `.replit` edit).
2. For each artifact directory that already has real content, temporarily move it aside
   (e.g. to `/tmp`), call `createArtifact` with the matching `artifactType`/`slug`/`previewPath`
   to get the platform to register a scaffold + workflow, then delete the scaffold and copy the
   real content back into place.
3. `createArtifact` only supports a handful of `artifactType`s (expo, openscad, react-vite,
   slides, video-js) and refuses to run if the target directory already exists — non-frontend
   artifact kinds (a plain API service, a mockup-sandbox/"design" canvas) can still get
   auto-registered as a side effect once the stack scan runs (observed: creating one react-vite
   artifact triggered a filesystem scan that auto-registered sibling `artifact.toml`s it found,
   including stale ones under an old backup folder — clean up any such stale copies immediately
   to avoid duplicate/wrong-path workflow registrations).
4. Delete the original backup/staging folder once real content is confirmed copied into the
   canonical `artifacts/<slug>/` path, to stop it from being rescanned and re-registered.
