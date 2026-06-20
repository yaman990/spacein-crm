-- Root admin flag (seed account; same authority as other admins)

ALTER TABLE crm_users
  ADD COLUMN IF NOT EXISTS is_root BOOLEAN NOT NULL DEFAULT false;
