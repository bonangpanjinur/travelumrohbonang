---
name: Vercel-import artifact duplication
description: Importing a Vercel/exported project that already contains .replit-artifact folders causes duplicate artifact/workflow registration.
---

When a "port existing Vercel app" task's imported source tree (e.g. under `.migration-backup/`) already has its own `.replit-artifact/artifact.toml` files — because it was previously built on Replit, exported, and now reimported — running `createArtifact` on the real target directories auto-discovers and registers those backup-tree artifacts too, creating duplicate workflows (e.g. `.migration-backup/artifacts/umroh-app: web` alongside the real `artifacts/umroh-app: web`).

**Why:** Artifact discovery scans the whole repo for `.replit-artifact` folders, not just the directories you intended to register.

**How to apply:** As soon as you notice this, `rm -rf` the `.replit-artifact` directories under the backup/import tree (not the real target artifacts). The duplicate workflows disappear automatically after the next workflow-list refresh — no separate deregistration call is needed.
