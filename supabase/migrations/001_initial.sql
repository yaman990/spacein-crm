-- SpaceIN CRM initial schema

CREATE TABLE IF NOT EXISTS crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  rank TEXT NOT NULL DEFAULT '',
  office TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  rented_by TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  join_date DATE,
  due_date DATE,
  amount NUMERIC(12, 3) NOT NULL DEFAULT 0,
  invoice_type TEXT NOT NULL DEFAULT 'subscription' CHECK (invoice_type IN ('subscription', 'rent')),
  rent_months INTEGER,
  monthly_rent NUMERIC(12, 3),
  rent_start DATE,
  rent_end DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  cr_expiry DATE
);

CREATE INDEX IF NOT EXISTS clients_due_date_idx ON clients (due_date);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients (status);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('paid', 'invoice', 'wa', 'email', 'created', 'receipt')),
  cid TEXT,
  cname TEXT,
  description TEXT NOT NULL,
  amt NUMERIC(12, 3),
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_ts_idx ON activity_log (ts DESC);

CREATE TABLE IF NOT EXISTS office_overrides (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS crm_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'
);

-- RLS: deny public access; server uses service role
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;
