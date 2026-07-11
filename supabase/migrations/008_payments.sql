-- Partial payments: an invoice can now be settled by several receipts over
-- time. `paid_amount` denormalises how much has been received so status and
-- money metrics read fast; the `payments` table is the receipt/audit trail.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 3) NOT NULL DEFAULT 0;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('issued', 'paid', 'partial', 'void'));

-- Existing fully-paid invoices: their whole amount has been received.
UPDATE invoices SET paid_amount = amount WHERE status = 'paid' AND paid_amount = 0;

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount NUMERIC(12, 3) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by_staff_id TEXT,
  receipt_path TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
