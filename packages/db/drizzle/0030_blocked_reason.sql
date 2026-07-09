-- Settings audit: Blocked visitors admin UI needs a reason on contact blocks (blocked_ips already has reason)

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS blocked_reason text;
