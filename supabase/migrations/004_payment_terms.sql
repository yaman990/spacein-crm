-- Separate contract term from payment terms.
-- payment_months = the client pays every N months (in advance);
-- existing contracts keep their old behaviour (one payment per term).
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_months INTEGER;
UPDATE contracts SET payment_months = months WHERE payment_months IS NULL;
