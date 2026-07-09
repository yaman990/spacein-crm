-- Registry status of a commercial client's CR, as reported by Sijilat
-- (Active / Suspended — CR not renewed / Cancelled / …). Kept separate from
-- cr_expiry because a CR can be suspended or cancelled without its date lapsing.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cr_status TEXT;
