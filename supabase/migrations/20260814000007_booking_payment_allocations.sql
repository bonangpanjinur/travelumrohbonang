-- Per-jamaah allocation for booking payments.
-- No allocation rows means the payment remains booking-level for backward compatibility.

CREATE TABLE IF NOT EXISTS booking_payment_allocations (
  id         TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES booking_payments(id) ON DELETE CASCADE,
  pilgrim_id TEXT NOT NULL REFERENCES booking_pilgrims(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_allocation_payment_pilgrim
  ON booking_payment_allocations(payment_id, pilgrim_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id
  ON booking_payment_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_pilgrim_id
  ON booking_payment_allocations(pilgrim_id);
