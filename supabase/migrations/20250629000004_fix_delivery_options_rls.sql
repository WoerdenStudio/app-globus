-- Corriger les droits d'écriture admin sur les options de livraison
DROP POLICY IF EXISTS "Admin can manage delivery options" ON delivery_options_config;

CREATE POLICY "Admin can manage delivery options"
  ON delivery_options_config
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
