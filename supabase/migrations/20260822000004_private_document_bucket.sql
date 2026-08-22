-- Private bucket for admin pilgrim documents.
-- Existing buckets are preserved; this only inserts the configured default when absent.
INSERT INTO storage.buckets (id, name, public)
VALUES ('pilgrim-documents', 'pilgrim-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;
