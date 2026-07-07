-- Case « Villa / arcade » sur les commandes
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_villa_or_arcade BOOLEAN NOT NULL DEFAULT false;
