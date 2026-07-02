-- SpaceIN CRM — Phase 1: contracts, invoices, office details
-- Adds the contract-based workflow (office -> contract -> invoice).

-- Client type (individual / commercial). Existing rows default to commercial.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'commercial'
  CHECK (type IN ('individual', 'commercial'));

-- Building-level address (shared by all offices). Usually a single row.
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  building_no TEXT NOT NULL DEFAULT '',
  road_no TEXT NOT NULL DEFAULT '',
  block_no TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-office details: area, per-term rates, multi-tenant capacity.
CREATE TABLE IF NOT EXISTS office_details (
  floor_key TEXT NOT NULL,
  office_no TEXT NOT NULL,
  area_sqm NUMERIC(10, 2),
  rate_3 NUMERIC(12, 3),
  rate_6 NUMERIC(12, 3),
  rate_9 NUMERIC(12, 3),
  rate_12 NUMERIC(12, 3),
  multi_tenant BOOLEAN NOT NULL DEFAULT false,
  capacity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (floor_key, office_no)
);

-- Contracts. One contract number is kept across renewals; each period is an invoice.
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_no TEXT NOT NULL DEFAULT '',
  client_id TEXT NOT NULL,
  floor_key TEXT,
  office_no TEXT,
  client_type TEXT NOT NULL DEFAULT 'commercial'
    CHECK (client_type IN ('individual', 'commercial')),
  monthly_rent NUMERIC(12, 3) NOT NULL DEFAULT 0,
  months INTEGER NOT NULL DEFAULT 12,
  renewal_months INTEGER NOT NULL DEFAULT 12,
  discount_value NUMERIC(12, 3) NOT NULL DEFAULT 0,
  discount_kind TEXT NOT NULL DEFAULT 'fixed'
    CHECK (discount_kind IN ('fixed', 'percent')),
  discount_scope TEXT NOT NULL DEFAULT 'this_period'
    CHECK (discount_scope IN ('this_period', 'every_period')),
  start_date DATE,
  end_date DATE,
  end_action TEXT NOT NULL DEFAULT 'auto_renew'
    CHECK (end_action IN ('auto_renew', 'terminate')),
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'active', 'renewal_await_payment', 'expired', 'closed')),
  renewal_count INTEGER NOT NULL DEFAULT 0,
  created_by_staff_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contracts_client_idx ON contracts (client_id);
CREATE INDEX IF NOT EXISTS contracts_office_idx ON contracts (floor_key, office_no);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts (status);

-- Invoices. One per contract period (initial term + each renewal).
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  amount NUMERIC(12, 3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'paid')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  paid_by_staff_id TEXT,
  receipt_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_contract_idx ON invoices (contract_id);

-- RLS: deny public access; the server uses the service role key.
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
