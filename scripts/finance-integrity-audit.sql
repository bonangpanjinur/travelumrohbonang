-- Sprint 0 — Finance Integrity Audit
-- READ-ONLY: this file only runs SELECT statements and does not modify data.
-- Run in Supabase SQL Editor or with:
--   psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f scripts/finance-integrity-audit.sql

BEGIN;
SET TRANSACTION READ ONLY;

-- 1. Non-positive or malformed monetary values.
SELECT
  'non_positive_booking_payments' AS check_name,
  bp.id,
  bp.booking_id,
  bp.amount,
  bp.is_voided,
  bp.reference_number
FROM booking_payments bp
WHERE COALESCE(bp.amount, 0) <= 0
ORDER BY bp.created_at DESC NULLS LAST;

SELECT
  'non_positive_manual_payments' AS check_name,
  p.id,
  p.booking_id,
  p.amount,
  p.status
FROM payments p
WHERE COALESCE(p.amount, 0) <= 0
ORDER BY p.created_at DESC NULLS LAST;

SELECT
  'non_positive_financial_transactions' AS check_name,
  ft.id,
  ft.booking_id,
  ft.amount,
  ft.type,
  ft.entry_type,
  ft.reference_number
FROM financial_transactions ft
WHERE COALESCE(ft.amount::numeric, 0) <= 0
ORDER BY ft.created_at DESC NULLS LAST;

-- 2. Active payments greater than booking total.
SELECT
  'booking_overpayment' AS check_name,
  b.id AS booking_id,
  b.booking_code,
  b.total_price,
  COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) AS total_paid,
  COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) - b.total_price AS excess_amount
FROM bookings b
LEFT JOIN booking_payments bp ON bp.booking_id = b.id
WHERE b.status <> 'cancelled'
GROUP BY b.id, b.booking_code, b.total_price
HAVING COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) > b.total_price
ORDER BY excess_amount DESC;

-- 3. Duplicate active payment references for the same booking.
SELECT
  'duplicate_active_payment_reference' AS check_name,
  bp.booking_id,
  bp.reference_number,
  COUNT(*) AS row_count,
  SUM(bp.amount) AS duplicated_amount
FROM booking_payments bp
WHERE bp.is_voided = false
  AND bp.reference_number IS NOT NULL
GROUP BY bp.booking_id, bp.reference_number
HAVING COUNT(*) > 1
ORDER BY row_count DESC, duplicated_amount DESC;

-- 4. Refunded amount greater than active money received.
SELECT
  'refund_exceeds_received_amount' AS check_name,
  r.booking_id,
  SUM(r.amount) FILTER (WHERE r.status = 'refunded') AS total_refunded,
  COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) AS total_received,
  SUM(r.amount) FILTER (WHERE r.status = 'refunded')
    - COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) AS excess_refund
FROM refund_requests r
LEFT JOIN booking_payments bp ON bp.booking_id = r.booking_id
GROUP BY r.booking_id
HAVING SUM(r.amount) FILTER (WHERE r.status = 'refunded')
       > COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0)
ORDER BY excess_refund DESC;

-- 5. Refund requests with invalid state or non-positive amount.
SELECT
  'invalid_refund_request' AS check_name,
  r.id,
  r.booking_id,
  r.amount,
  r.status,
  r.processed_by,
  r.created_at
FROM refund_requests r
WHERE COALESCE(r.amount, 0) <= 0
   OR r.status NOT IN ('pending', 'approved', 'rejected', 'refunded')
ORDER BY r.created_at DESC NULLS LAST;

-- 6. Verified manual payments without the expected auto-journal reference.
SELECT
  'verified_payment_without_journal' AS check_name,
  p.id AS payment_id,
  p.booking_id,
  p.amount,
  p.verified_at,
  p.verified_by
FROM payments p
WHERE p.status = 'verified'
  AND NOT EXISTS (
    SELECT 1
    FROM financial_transactions ft
    WHERE ft.reference_number = 'auto:payment_verified:' || p.id
  )
ORDER BY p.verified_at DESC NULLS LAST;

-- 7. Paid gateway transactions without a matching booking payment.
SELECT
  'paid_gateway_without_booking_payment' AS check_name,
  pgt.id,
  pgt.booking_id,
  pgt.gateway,
  pgt.order_id,
  pgt.amount,
  pgt.paid_at
FROM payment_gateway_transactions pgt
WHERE pgt.status = 'paid'
  AND pgt.booking_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM booking_payments bp
    WHERE bp.booking_id = pgt.booking_id
      AND bp.is_voided = false
      AND bp.reference_number = pgt.order_id
  )
ORDER BY pgt.paid_at DESC NULLS LAST;

-- 8. Duplicate financial journal references.
SELECT
  'duplicate_financial_reference' AS check_name,
  ft.reference_number,
  COUNT(*) AS line_count,
  COUNT(*) FILTER (WHERE ft.entry_type = 'debit') AS debit_lines,
  COUNT(*) FILTER (WHERE ft.entry_type = 'credit') AS credit_lines,
  SUM(ft.amount::numeric) AS total_lines
FROM financial_transactions ft
WHERE ft.reference_number IS NOT NULL
GROUP BY ft.reference_number
HAVING COUNT(*) > 2
ORDER BY line_count DESC;

-- 9. Unbalanced journal references by debit/credit amount.
SELECT
  'unbalanced_journal' AS check_name,
  ft.reference_number,
  COUNT(*) AS line_count,
  COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'debit'), 0) AS debit_total,
  COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'credit'), 0) AS credit_total,
  COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'debit'), 0)
    - COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'credit'), 0) AS imbalance
FROM financial_transactions ft
WHERE ft.reference_number IS NOT NULL
GROUP BY ft.reference_number
HAVING COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'debit'), 0)
       <> COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'credit'), 0)
ORDER BY ABS(
  COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'debit'), 0)
  - COALESCE(SUM(ft.amount::numeric) FILTER (WHERE ft.entry_type = 'credit'), 0)
) DESC;

-- 10. Fully paid bookings whose operational status is not confirmed/completed.
SELECT
  'fully_paid_booking_status_mismatch' AS check_name,
  b.id AS booking_id,
  b.booking_code,
  b.status,
  b.total_price,
  COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) AS total_paid
FROM bookings b
LEFT JOIN booking_payments bp ON bp.booking_id = b.id
WHERE b.status NOT IN ('cancelled', 'confirmed', 'completed')
GROUP BY b.id, b.booking_code, b.status, b.total_price
HAVING COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) >= b.total_price
ORDER BY b.created_at DESC NULLS LAST;

-- 11. Costs and budgets with non-positive values.
SELECT
  'invalid_package_cost' AS check_name,
  pc.id,
  pc.package_id,
  pc.departure_id,
  pc.item_name,
  pc.qty,
  pc.unit_cost,
  pc.actual_amount
FROM package_costs pc
WHERE COALESCE(pc.qty::numeric, 0) <= 0
   OR COALESCE(pc.unit_cost::numeric, 0) < 0
   OR COALESCE(pc.actual_amount::numeric, 0) < 0
ORDER BY pc.created_at DESC NULLS LAST;

SELECT
  'invalid_budget' AS check_name,
  b.id,
  b.period_year,
  b.period_month,
  b.category,
  b.budget_type,
  b.amount
FROM budgets b
WHERE b.period_year < 2000
   OR b.period_month IS NOT NULL AND (b.period_month < 1 OR b.period_month > 12)
   OR COALESCE(b.amount, 0) < 0
   OR b.budget_type NOT IN ('income', 'expense')
ORDER BY b.period_year, b.period_month;

-- 12. Summary counts for quick triage. A zero count is the desired result.
WITH checks AS (
  SELECT 'non_positive_booking_payments' AS check_name, COUNT(*) AS issue_count
  FROM booking_payments WHERE COALESCE(amount, 0) <= 0
  UNION ALL
  SELECT 'booking_overpayment', COUNT(*)
  FROM (
    SELECT b.id
    FROM bookings b LEFT JOIN booking_payments bp ON bp.booking_id = b.id
    WHERE b.status <> 'cancelled'
    GROUP BY b.id, b.total_price
    HAVING COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0) > b.total_price
  ) q
  UNION ALL
  SELECT 'duplicate_active_payment_reference', COUNT(*)
  FROM (
    SELECT booking_id, reference_number
    FROM booking_payments
    WHERE is_voided = false AND reference_number IS NOT NULL
    GROUP BY booking_id, reference_number
    HAVING COUNT(*) > 1
  ) q
  UNION ALL
  SELECT 'refund_exceeds_received_amount', COUNT(*)
  FROM (
    SELECT r.booking_id
    FROM refund_requests r
    LEFT JOIN booking_payments bp ON bp.booking_id = r.booking_id
    GROUP BY r.booking_id
    HAVING SUM(r.amount) FILTER (WHERE r.status = 'refunded')
           > COALESCE(SUM(bp.amount) FILTER (WHERE bp.is_voided = false), 0)
  ) q
  UNION ALL
  SELECT 'unbalanced_journal', COUNT(*)
  FROM (
    SELECT reference_number
    FROM financial_transactions
    WHERE reference_number IS NOT NULL
    GROUP BY reference_number
    HAVING COALESCE(SUM(amount::numeric) FILTER (WHERE entry_type = 'debit'), 0)
           <> COALESCE(SUM(amount::numeric) FILTER (WHERE entry_type = 'credit'), 0)
  ) q
)
SELECT check_name, issue_count, issue_count = 0 AS passed
FROM checks
ORDER BY check_name;

COMMIT;
