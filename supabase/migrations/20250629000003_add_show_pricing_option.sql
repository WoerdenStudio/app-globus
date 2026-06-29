-- Option admin : afficher le tarif aux collaborateurs (désactivée par défaut)
INSERT INTO delivery_options_config (key, label, enabled) VALUES
  ('show_pricing', 'Afficher le tarif', false)
ON CONFLICT (key) DO NOTHING;
