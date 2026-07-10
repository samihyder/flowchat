-- Platform-level super admin: can access any tenant's workspace with full admin rights

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;
