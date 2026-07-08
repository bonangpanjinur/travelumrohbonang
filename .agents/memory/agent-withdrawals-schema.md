---
name: Agent withdrawals schema
description: Correct field names in agentWithdrawals table after P2-7 fix
---

## Schema (lib/db/src/schema/agents.ts)
After P2-7 fix, agentWithdrawals has separate bank fields:
- `bankName`, `bankAccount`, `accountHolder` (separate columns, NOT a single `bank_details` JSON)
- `notes` (agent's notes)
- `adminNotes`, `proofUrl`, `processedBy`, `processedAt`
- `status` values: requested | approved | rejected | paid

**Why:** Original schema had a single `bank_details: text` field but the UI (AgentWithdrawals.tsx) expected separate columns. Fixed by updating schema.

## Admin API join
`GET /api/admin/agents/withdrawals` joins with `agents` table to return `agentName`, `agentEmail`, `agentPhone` alongside withdrawal fields.

## PATCH validation
Only allows `{ status, adminNotes, proofUrl }` — no raw req.body pass-through.
`processedAt` auto-set when status transitions to paid/approved/rejected.
