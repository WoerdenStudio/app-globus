-- Seed data pour Globus Livraison
-- NOTE: Les utilisateurs auth doivent être créés via le dashboard Supabase ou l'API Admin.
-- Ce seed crée les profils une fois les users auth existants.
-- Voir README pour les comptes de test.

-- Lieux de départ
INSERT INTO pickup_locations (id, label, active, sort_order) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Service client lounge RDC', true, 1),
  ('a0000000-0000-4000-8000-000000000002', 'Service cadeaux -1', true, 2),
  ('a0000000-0000-4000-8000-000000000003', 'Quai de chargement', true, 3);

-- Tarif de base (hypothèse — à confirmer avec Vélopostale)
INSERT INTO pricing_rules (id, label, base_price_chf, modifiers, active) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Tarif standard', 25.00,
   '{"fragile": 5.00, "perishable": 3.00, "extra_insurance": 15.00}'::jsonb, true);

-- Paramètres applicatifs
INSERT INTO settings (key, value) VALUES
  ('app_settings', '{
    "operating_hours": {
      "monday": {"open": "08:00", "close": "19:00"},
      "tuesday": {"open": "08:00", "close": "19:00"},
      "wednesday": {"open": "08:00", "close": "19:00"},
      "thursday": {"open": "08:00", "close": "19:00"},
      "friday": {"open": "08:00", "close": "19:00"},
      "saturday": {"open": "09:00", "close": "18:00"},
      "sunday": {"open": "00:00", "close": "00:00", "closed": true}
    },
    "cutoffs": {
      "weekday": "17:30",
      "saturday": "16:00"
    },
    "globus_notification_email": "livraison@globus.ch"
  }'::jsonb);

-- Options de livraison
INSERT INTO delivery_options_config (key, label, enabled) VALUES
  ('leave_at_door', 'Laisser devant la porte', true),
  ('fragile', 'Très fragile', true),
  ('perishable', 'Produits frais / périssables', true),
  ('extra_insurance', 'Assurance complémentaire', true),
  ('show_pricing', 'Afficher le tarif', false);

-- Commandes de démo (nécessite des profils existants — insérées conditionnellement)
-- Les profils et users de test sont documentés dans le README.
-- Après création des users auth, exécuter :
-- INSERT INTO profiles (id, full_name, role, department, active) VALUES
--   ('<admin-uuid>', 'Admin Test', 'admin', 'service_client', true),
--   ('<collab-uuid>', 'Collaborateur Test', 'collaborateur', 'service_cadeaux', true);
