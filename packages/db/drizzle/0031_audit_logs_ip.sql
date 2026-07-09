-- Settings audit: Audit Log IP column (wireframe 18)

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
