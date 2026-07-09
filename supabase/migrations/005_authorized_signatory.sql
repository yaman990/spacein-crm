-- Commercial clients: authorized signatory who signs contracts on behalf of
-- the CR (printed in the lease contract as the company's representative).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS authorized_name TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS authorized_cpr TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS authorized_nationality TEXT NOT NULL DEFAULT '';
