-- Individual clients: their CPR (national ID) number. Commercial clients use
-- the CR fields (cr name / number / expiry) instead.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpr TEXT;
