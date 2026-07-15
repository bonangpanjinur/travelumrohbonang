---
name: Artifact registration stuck despite valid artifact.toml
description: listArtifacts()/listWorkflows() return empty even though artifact.toml files exist and validate; how to force a rescan.
---

## Symptom
Multiple artifacts (e.g. ported from an import/migration) have valid `.replit-artifact/artifact.toml` files, but `listArtifacts()` and `listWorkflows()` return empty, so `WorkflowsRestart` has no workflow name to target and nothing shows in preview.

## Fix
Call `createArtifact()` for a disposable throwaway artifact (any fresh slug, e.g. `scan-trigger-tmp`). This triggers a platform rescan that picks up and registers the real, already-present artifacts and their workflows too. Afterward, delete the throwaway artifact directory and its workflow — it was only a trigger, not part of the product.

**Why:** the registration path only runs on certain events (like `createArtifact`); dropping valid `artifact.toml` files into the tree (e.g. from a migration/import) doesn't by itself trigger a scan.

**How to apply:** if `listArtifacts()`/`listWorkflows()` are unexpectedly empty but `artifact.toml` files look correct, try this before assuming the files are malformed.
