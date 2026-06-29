-- Nom de l'hôtel (obligatoire si is_hotel = true)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS hotel_name TEXT;
