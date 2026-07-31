-- Migration: Backfill agents.user_id for existing agent accounts
-- Links agents records to their auth user via email match.
-- Safe to run multiple times (idempotent).

UPDATE agents a
SET user_id = p.id::text
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email = a.email
  AND a.user_id IS NULL
  AND ur.role = 'agent';
