create table if not exists public.payment_policies (
  id text primary key,
  name text not null,
  scope text not null default 'global' check (scope in ('global', 'package')),
  package_id text references public.packages(id) on delete cascade,
  inherits_global boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  version integer not null default 1 check (version > 0),
  effective_from timestamptz,
  effective_until timestamptz,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_policies_scope_package_check check (
    (scope = 'global' and package_id is null) or
    (scope = 'package' and package_id is not null)
  ),
  constraint payment_policies_effective_window_check check (
    effective_until is null or effective_from is null or effective_until >= effective_from
  )
);

create index if not exists idx_payment_policies_scope_status
  on public.payment_policies(scope, status);
create index if not exists idx_payment_policies_package_id
  on public.payment_policies(package_id);
create unique index if not exists uq_payment_policies_scope_package_version
  on public.payment_policies(scope, package_id, version);

create table if not exists public.payment_policy_rules (
  id text primary key,
  policy_id text not null references public.payment_policies(id) on delete cascade,
  rule_code text not null,
  rule_type text not null,
  value jsonb not null,
  currency text,
  is_enabled boolean not null default true,
  display_order integer not null default 0,
  display_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_policy_rules_rule_type_check check (
    rule_type in ('percentage', 'fixed_amount', 'days_before_departure', 'installment', 'tiered', 'boolean', 'text')
  ),
  constraint payment_policy_rules_code_check check (length(trim(rule_code)) > 0)
);

create unique index if not exists uq_payment_policy_rules_policy_code
  on public.payment_policy_rules(policy_id, rule_code);
create index if not exists idx_payment_policy_rules_policy_id
  on public.payment_policy_rules(policy_id);

comment on table public.payment_policies is 'Versioned global and package-specific payment policies. Booking snapshots will be added in a later stage.';
comment on table public.payment_policy_rules is 'Structured payment rules used for validation, calculation, and invoice rendering.';
