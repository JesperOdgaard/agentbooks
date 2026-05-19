-- Tilføj e-conomic leverandørnummer til suppliers-tabellen
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS economic_id integer NULL;

-- Tilføj e-conomic bogføringsnummer til invoices (journalnummer fra e-conomic)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS economic_booked_number integer NULL,
  ADD COLUMN IF NOT EXISTS economic_booked_at timestamptz NULL;

COMMENT ON COLUMN suppliers.economic_id IS 'Leverandørnummer i e-conomic';
COMMENT ON COLUMN invoices.economic_booked_number IS 'Bogføringsnummer i e-conomic efter afsendelse';
COMMENT ON COLUMN invoices.economic_booked_at IS 'Tidspunkt for bogføring i e-conomic';
