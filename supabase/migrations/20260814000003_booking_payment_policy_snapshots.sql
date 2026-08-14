alter table public.bookings
  add column if not exists payment_policy_snapshot jsonb,
  add column if not exists payment_schedule_snapshot jsonb;

comment on column public.bookings.payment_policy_snapshot is 'Immutable effective payment policy captured when the booking was created.';
comment on column public.bookings.payment_schedule_snapshot is 'Calculated DP/installment/final-payment schedule captured when the booking was created.';
