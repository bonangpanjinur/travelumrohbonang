#!/usr/bin/env python3
"""Static guard for tenant isolation on admin mutation routes.

This is intentionally conservative: it checks only routes that mutate data and
requires an explicit scope helper/reference in the route file. Global-only
modules can be added to ALLOWLIST with a documented reason.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "artifacts" / "api-server" / "src" / "routes" / "admin"
ALLOWLIST = {
    # These modules are global configuration by design; mutations are guarded
    # by their route-level role middleware or are not tenant-owned records.
    "settings.ts": "global branding/settings",
    "roles.ts": "global role administration",
    "permissions.ts": "global permission administration",
}
# Existing debt is explicitly inventoried so the gate prevents regressions
# without pretending that every historical route is already hardened.
LEGACY_SCOPE_DEBT = {
    "accounting.ts", "bank-reconciliation.ts", "branches.ts", "budget.ts",
    "chats.ts", "coa.ts", "content.ts", "contracts.ts", "conversations.ts",
    "costs.ts", "coupons.ts", "currencies.ts", "document-types.ts",
    "feature-flags.ts", "gallery.ts", "integrations.ts", "itineraries.ts",
    "loyalty.ts", "masterdata.ts", "menu-permissions.ts", "packages.ts",
    "payment-gateway.ts", "pilgrim-equipment.ts", "pilgrims-db.ts",
    "pilgrims.ts", "redirects.ts", "reviews.ts", "seat-assignment.ts",
    "seo.ts", "social-kit.ts", "testimonials.ts", "uploads.ts", "users.ts",
    "visa.ts",
}
MUTATION = re.compile(r"router\.(post|patch|put|delete)\s*\(")
GUARD = re.compile(r"resolveUserScope|assert[A-Za-z0-9_]*(Scope|scope)|Scope|scope|tenant", re.I)


def main() -> int:
    failures: list[str] = []
    checked = 0
    for path in sorted(ROOT.glob("*.ts")):
        text = path.read_text(encoding="utf-8")
        if not MUTATION.search(text):
            continue
        checked += 1
        if path.name in ALLOWLIST:
            continue
        if not GUARD.search(text):
            if path.name in LEGACY_SCOPE_DEBT:
                print(f"WARNING legacy tenant-scope debt — {path.name}")
            else:
                failures.append(f"{path.relative_to(ROOT)}: mutation route has no explicit scope guard")
    if failures:
        print("Admin tenant guard check failed:")
        print("\n".join(f"  - {item}" for item in failures))
        return 1
    print(f"Admin tenant guard check OK: {checked} mutation route files checked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
