-- Informations complémentaires sur le créneau de livraison (facultatif)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS time_slot_notes TEXT;
