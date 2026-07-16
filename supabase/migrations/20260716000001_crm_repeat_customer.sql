-- CRM: repeat customer detection + interaction staleness tracking
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS is_repeat_customer  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamp with time zone;

COMMENT ON COLUMN leads.is_repeat_customer  IS 'True when phone/email matched an existing booking pilgrim';
COMMENT ON COLUMN leads.last_interaction_at IS 'Timestamp of the most recent logged interaction; used for staleness badge';
