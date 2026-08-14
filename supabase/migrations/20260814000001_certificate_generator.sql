CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  certificate_type TEXT NOT NULL DEFAULT 'umroh',
  design JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificate_templates_branch_id ON certificate_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_type ON certificate_templates(certificate_type);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES certificate_templates(id) ON DELETE SET NULL,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pilgrim_id TEXT NOT NULL REFERENCES booking_pilgrims(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL DEFAULT 'umroh',
  certificate_number TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  performer_name TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_branch_id ON certificates(branch_id);
CREATE INDEX IF NOT EXISTS idx_certificates_booking_id ON certificates(booking_id);
CREATE INDEX IF NOT EXISTS idx_certificates_pilgrim_id ON certificates(pilgrim_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_certificates_number ON certificates(certificate_number);
