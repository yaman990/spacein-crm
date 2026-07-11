-- Allow an invoice to be written off ("void") — used when a contract is closed
-- with an unpaid balance the business decides not to collect. Void invoices are
-- excluded from receivables, but (unlike before) simply closing a contract no
-- longer hides an unpaid invoice: the balance stays outstanding until it is
-- either paid or explicitly voided here.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check CHECK (status IN ('issued', 'paid', 'void'));
