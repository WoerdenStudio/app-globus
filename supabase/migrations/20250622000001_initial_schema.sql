-- Globus Livraison — Schéma initial
-- Enums
CREATE TYPE user_role AS ENUM ('collaborateur', 'admin');
CREATE TYPE department AS ENUM ('service_client', 'service_cadeaux', 'autre');
CREATE TYPE access_type AS ENUM ('code', 'interphone', 'acces_libre', 'autre');
CREATE TYPE order_status AS ENUM ('created', 'en_cours', 'livree', 'annulee');

-- Profiles (lié à auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'collaborateur',
  department department NOT NULL DEFAULT 'autre',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lieux de départ
CREATE TABLE pickup_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grille tarifaire
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  base_price_chf NUMERIC(10, 2) NOT NULL DEFAULT 0,
  modifiers JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paramètres applicatifs (horaires, cutoffs, emails)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Options de livraison activables
CREATE TABLE delivery_options_config (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- Commandes (courses)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_location_id UUID REFERENCES pickup_locations(id),
  pickup_address_custom TEXT,
  delivery_address TEXT NOT NULL,
  access_type access_type NOT NULL,
  access_detail TEXT,
  is_hotel BOOLEAN NOT NULL DEFAULT false,
  hotel_room_number TEXT,
  floor TEXT,
  client_name TEXT,
  client_phone TEXT,
  requested_date DATE,
  requested_time_slot TEXT,
  weight NUMERIC(10, 2),
  dimensions TEXT,
  leave_at_door BOOLEAN NOT NULL DEFAULT false,
  fragile BOOLEAN NOT NULL DEFAULT false,
  perishable BOOLEAN NOT NULL DEFAULT false,
  goods_photo_url TEXT,
  declared_value_chf NUMERIC(12, 2),
  extra_insurance BOOLEAN NOT NULL DEFAULT false,
  special_instructions TEXT,
  status order_status NOT NULL DEFAULT 'created',
  price_chf NUMERIC(10, 2),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logtech_ref TEXT
);

-- Index
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_pickup_location ON orders(pickup_location_id);
CREATE INDEX idx_orders_requested_date ON orders(requested_date);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pickup_locations_updated_at BEFORE UPDATE ON pickup_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction helper : vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper : vérifier si l'utilisateur est actif
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-création du profil à l'inscription (désactivée — comptes créés par admin/seed)
-- Les profils sont créés manuellement ou via seed

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_options_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin can manage all profiles"
  ON profiles FOR ALL
  USING (is_admin());

-- Pickup locations policies
CREATE POLICY "Authenticated users can read pickup locations"
  ON pickup_locations FOR SELECT
  USING (is_active_user());

CREATE POLICY "Admin can manage pickup locations"
  ON pickup_locations FOR ALL
  USING (is_admin());

-- Pricing rules policies
CREATE POLICY "Authenticated users can read pricing rules"
  ON pricing_rules FOR SELECT
  USING (is_active_user());

CREATE POLICY "Admin can manage pricing rules"
  ON pricing_rules FOR ALL
  USING (is_admin());

-- Settings policies
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  USING (is_active_user());

CREATE POLICY "Admin can manage settings"
  ON settings FOR ALL
  USING (is_admin());

-- Delivery options policies
CREATE POLICY "Authenticated users can read delivery options"
  ON delivery_options_config FOR SELECT
  USING (is_active_user());

CREATE POLICY "Admin can manage delivery options"
  ON delivery_options_config FOR ALL
  USING (is_admin());

-- Orders policies — historique visible par tous les collaborateurs authentifiés
CREATE POLICY "Authenticated users can read all orders"
  ON orders FOR SELECT
  USING (is_active_user());

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (is_active_user() AND created_by = auth.uid());

CREATE POLICY "Authenticated users can update own orders"
  ON orders FOR UPDATE
  USING (is_active_user() AND (created_by = auth.uid() OR is_admin()));

CREATE POLICY "Admin can delete orders"
  ON orders FOR DELETE
  USING (is_admin());

-- Storage bucket pour photos de marchandise
INSERT INTO storage.buckets (id, name, public)
VALUES ('goods-photos', 'goods-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload goods photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'goods-photos' AND is_active_user()
  );

CREATE POLICY "Anyone can view goods photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'goods-photos');

CREATE POLICY "Users can update own goods photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'goods-photos' AND is_active_user());

CREATE POLICY "Admin can delete goods photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'goods-photos' AND is_admin());
