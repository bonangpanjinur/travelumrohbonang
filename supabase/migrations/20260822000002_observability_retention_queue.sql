-- Production observability and retention foundation.
-- Destructive purge is intentionally not performed by this migration.
-- This migration is self-contained: it also creates the legacy log tables
-- required by the retention policies when they do not exist yet.

CREATE TABLE IF NOT EXISTS public.request_log (
  id text PRIMARY KEY,
  ip text,
  endpoint text NOT NULL,
  user_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_log_user_id ON public.request_log(user_id);
CREATE INDEX IF NOT EXISTS idx_request_log_created_at ON public.request_log(created_at);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id text PRIMARY KEY,
  user_id text,
  level text NOT NULL,
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  context jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON public.error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  user_id text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

CREATE TABLE IF NOT EXISTS public.pilgrim_doc_access_logs (
  id text PRIMARY KEY,
  user_id text,
  pilgrim_id text,
  doc_type text,
  storage_path text,
  context text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_doc_access_logs_user_id ON public.pilgrim_doc_access_logs(user_id);

CREATE TABLE IF NOT EXISTS public.log_retention_policies (
  id text PRIMARY KEY,
  log_type text NOT NULL UNIQUE,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  archive_before_delete boolean NOT NULL DEFAULT false,
  legal_hold_supported boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  policy_version integer NOT NULL DEFAULT 1,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.log_retention_holds (
  id text PRIMARY KEY,
  log_type text NOT NULL,
  entity_id text,
  correlation_id text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by text NOT NULL,
  released_by text,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_log_retention_holds_lookup ON public.log_retention_holds(log_type, entity_id, correlation_id, status);

CREATE TABLE IF NOT EXISTS public.log_retention_runs (
  id text PRIMARY KEY,
  log_type text NOT NULL,
  policy_version integer NOT NULL,
  cutoff_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  last_cursor text,
  scanned_count integer NOT NULL DEFAULT 0,
  deleted_count integer NOT NULL DEFAULT 0,
  skipped_hold_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error_message text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_log_retention_runs_status ON public.log_retention_runs(status, started_at);

CREATE TABLE IF NOT EXISTS public.retention_purge_audit (
  id text PRIMARY KEY,
  run_id text NOT NULL,
  log_type text NOT NULL,
  row_count integer NOT NULL,
  content_hash text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  executed_by text NOT NULL DEFAULT 'system',
  correlation_id text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_retention_purge_audit_run_id ON public.retention_purge_audit(run_id);

CREATE TABLE IF NOT EXISTS public.error_events (
  id text PRIMARY KEY,
  fingerprint text NOT NULL,
  severity text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL,
  route text,
  operation text,
  correlation_id text,
  request_id text,
  user_id text,
  message_redacted text NOT NULL,
  stack_redacted text,
  metadata jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  acknowledged_by text,
  acknowledged_at timestamptz,
  resolved_by text,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_error_events_fingerprint ON public.error_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_events_status ON public.error_events(status, last_seen_at);

CREATE TABLE IF NOT EXISTS public.job_queue (
  id text PRIMARY KEY,
  job_type text NOT NULL,
  dedupe_key text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 100,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error_code text,
  last_error_message text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_queue_pick ON public.job_queue(status, available_at, priority);
CREATE INDEX IF NOT EXISTS idx_job_queue_dedupe ON public.job_queue(job_type, dedupe_key);

CREATE TABLE IF NOT EXISTS public.job_attempts (
  id text PRIMARY KEY,
  job_id text NOT NULL,
  attempt_number integer NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  error_code text,
  error_message text,
  provider_request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_attempts_job_id ON public.job_attempts(job_id);

CREATE TABLE IF NOT EXISTS public.alert_events (
  id text PRIMARY KEY,
  alert_key text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL,
  fingerprint text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  acknowledged_by text,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_events_fingerprint ON public.alert_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_alert_events_status ON public.alert_events(status, last_seen_at);

-- Conservative defaults. These rows configure policy only; no deletion is performed.
INSERT INTO public.log_retention_policies (id, log_type, retention_days, archive_before_delete, legal_hold_supported)
VALUES
  ('ret-request', 'request', 30, false, true),
  ('ret-error', 'application_error', 90, false, true),
  ('ret-audit', 'security_audit', 730, false, true),
  ('ret-proof-access', 'proof_access', 730, false, true),
  ('ret-purge-audit', 'purge_audit', 730, false, true)
ON CONFLICT (log_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_request_log_created_at ON public.request_log(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
