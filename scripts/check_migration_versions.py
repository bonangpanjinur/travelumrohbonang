#!/usr/bin/env python3
"""Validate Supabase migration version prefixes before deployment.

Historical duplicate prefixes are reported as warnings because renaming an
already-applied migration can make a remote migration ledger diverge. New
duplicates fail the command and must use a unique version prefix.
"""
from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

MIGRATION_DIR = Path(__file__).resolve().parents[1] / "supabase" / "migrations"
LEGACY_DUPLICATES = {
    "0000",
    "20260802000001",
    "20260814000001",
}


def main() -> int:
    versions: dict[str, list[str]] = defaultdict(list)
    invalid: list[str] = []

    for path in sorted(MIGRATION_DIR.glob("*.sql")):
        prefix = path.name.split("_", 1)[0]
        if not prefix.isdigit():
            invalid.append(path.name)
        versions[prefix].append(path.name)

    failures: list[str] = []
    for version, names in sorted(versions.items()):
        if len(names) <= 1:
            continue
        label = f"{version}: {', '.join(names)}"
        if version in LEGACY_DUPLICATES:
            print(f"WARNING legacy duplicate migration version — {label}")
        else:
            failures.append(label)

    if invalid:
        failures.extend(f"invalid filename: {name}" for name in invalid)

    if failures:
        print("ERROR migration governance check failed:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"Migration governance OK: {len(versions)} version prefixes checked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
