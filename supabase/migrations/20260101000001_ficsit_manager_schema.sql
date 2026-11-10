-- FicsitManager - Gestionnaire d'usine Satisfactory
-- Schéma complet avec toutes les recettes

-- Nettoyage des anciennes tables
DROP TABLE IF EXISTS order_packages CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS delivery_options_config CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS pickup_locations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS access_type CASCADE;
DROP TYPE IF EXISTS department CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Types pour Satisfactory
CREATE TYPE resource_type AS ENUM ('raw', 'ore', 'refined', 'manufactured', 'component', 'special');
CREATE TYPE building_type AS ENUM ('miner', 'constructor', 'assembler', 'foundry', 'smelter', 'manufacturer', 'refinery', 'packager', 'blender');
CREATE TYPE recipe_tier AS ENUM ('tier_0', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6', 'tier_7', 'tier_8');

-- Table des profils utilisateur (simplifié pour usage personnel)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des ressources brutes (minerais)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  type resource_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des bâtiments
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  type building_type NOT NULL,
  power_consumption NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des objets (items fabriqués)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  type resource_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des recettes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  building_id UUID NOT NULL REFERENCES buildings(id),
  is_alternate BOOLEAN NOT NULL DEFAULT false,
  production_time NUMERIC(10, 2) NOT NULL, -- en secondes
  tier recipe_tier NOT NULL DEFAULT 'tier_0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des ingrédients de recette
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des produits de recette
CREATE TABLE recipe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des usines de l'utilisateur
CREATE TABLE user_factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des extracteurs/mineurs de l'utilisateur
CREATE TABLE user_extractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES user_factories(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id),
  building_id UUID NOT NULL REFERENCES buildings(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  purity TEXT NOT NULL DEFAULT 'normal', -- impure, normal, pure
  overclock_percentage INTEGER NOT NULL DEFAULT 100,
  extraction_rate NUMERIC(10, 2) NOT NULL, -- items/min
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des lignes de production de l'utilisateur
CREATE TABLE user_production_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES user_factories(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  building_count INTEGER NOT NULL DEFAULT 1,
  overclock_percentage INTEGER NOT NULL DEFAULT 100,
  production_rate NUMERIC(10, 2) NOT NULL, -- items/min du produit principal
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_recipes_building ON recipes(building_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_item ON recipe_ingredients(item_id);
CREATE INDEX idx_recipe_products_recipe ON recipe_products(recipe_id);
CREATE INDEX idx_recipe_products_item ON recipe_products(item_id);
CREATE INDEX idx_user_extractors_factory ON user_extractors(factory_id);
CREATE INDEX idx_user_extractors_resource ON user_extractors(resource_id);
CREATE INDEX idx_user_production_lines_factory ON user_production_lines(factory_id);
CREATE INDEX idx_user_production_lines_recipe ON user_production_lines(recipe_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_factories_updated_at BEFORE UPDATE ON user_factories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_extractors_updated_at BEFORE UPDATE ON user_extractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_production_lines_updated_at BEFORE UPDATE ON user_production_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_extractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_production_lines ENABLE ROW LEVEL SECURITY;

-- Policies pour les profils
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies pour les données de référence (lecture seule pour tous)
CREATE POLICY "Anyone authenticated can read resources"
  ON resources FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can read buildings"
  ON buildings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can read items"
  ON items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can read recipes"
  ON recipes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can read recipe_ingredients"
  ON recipe_ingredients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can read recipe_products"
  ON recipe_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policies pour les données utilisateur
CREATE POLICY "Users can manage own factories"
  ON user_factories FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own extractors"
  ON user_extractors FOR ALL
  USING (
    factory_id IN (SELECT id FROM user_factories WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own production lines"
  ON user_production_lines FOR ALL
  USING (
    factory_id IN (SELECT id FROM user_factories WHERE user_id = auth.uid())
  );

-- Insertion des données de référence Satisfactory

-- Ressources brutes (minerais)
INSERT INTO resources (name, display_name, type, description) VALUES
('iron_ore', 'Minerai de fer', 'ore', 'Minerai de base utilisé pour créer des lingots de fer'),
('copper_ore', 'Minerai de cuivre', 'ore', 'Minerai de base utilisé pour créer des lingots de cuivre'),
('limestone', 'Calcaire', 'ore', 'Minerai de base utilisé pour créer du béton'),
('coal', 'Charbon', 'ore', 'Combustible et ingrédient de fabrication'),
('caterium_ore', 'Minerai de caterium', 'ore', 'Minerai rare utilisé pour des composants avancés'),
('raw_quartz', 'Quartz brut', 'ore', 'Minerai utilisé pour le cristal de quartz'),
('sulfur', 'Soufre', 'ore', 'Minerai utilisé pour la poudre noire et les explosifs'),
('bauxite', 'Bauxite', 'ore', 'Minerai utilisé pour créer de l''aluminium'),
('uranium', 'Uranium', 'ore', 'Minerai radioactif pour l''énergie nucléaire'),
('crude_oil', 'Pétrole brut', 'raw', 'Ressource liquide raffinée en carburant et plastique'),
('water', 'Eau', 'raw', 'Ressource liquide utilisée dans diverses recettes'),
('nitrogen_gas', 'Azote gazeux', 'raw', 'Gaz utilisé pour des recettes avancées');

-- Bâtiments
INSERT INTO buildings (name, display_name, type, power_consumption, description) VALUES
-- Extracteurs
('miner_mk1', 'Mineur Mk.1', 'miner', 5, 'Extracteur de base pour minerais solides'),
('miner_mk2', 'Mineur Mk.2', 'miner', 12, 'Extracteur amélioré avec meilleur débit'),
('miner_mk3', 'Mineur Mk.3', 'miner', 30, 'Extracteur avancé avec excellent débit'),
('water_extractor', 'Extracteur d''eau', 'miner', 20, 'Extrait l''eau des sources'),
('oil_extractor', 'Extracteur de pétrole', 'miner', 40, 'Extrait le pétrole brut'),
('resource_well_pressurizer', 'Pressuriseur de puits', 'miner', 150, 'Extrait l''azote gazeux'),
-- Bâtiments de production
('smelter', 'Fonderie', 'smelter', 4, 'Transforme les minerais en lingots'),
('constructor', 'Constructeur', 'constructor', 4, 'Fabrique des pièces simples'),
('assembler', 'Assembleur', 'assembler', 15, 'Assemble des composants avec plusieurs ingrédients'),
('manufacturer', 'Fabricant', 'manufacturer', 55, 'Fabrique des objets complexes'),
('foundry', 'Forge', 'foundry', 16, 'Fond plusieurs types de métaux ensemble'),
('refinery', 'Raffinerie', 'refinery', 30, 'Raffine les liquides et gaz'),
('packager', 'Conditionneur', 'packager', 10, 'Emballe ou déballe les liquides'),
('blender', 'Mélangeur', 'blender', 75, 'Mélange plusieurs ingrédients complexes');

-- Items (objets fabriqués) - On commence par les plus basiques
INSERT INTO items (name, display_name, type, description) VALUES
-- Lingots
('iron_ingot', 'Lingot de fer', 'refined', 'Lingot de base en fer'),
('copper_ingot', 'Lingot de cuivre', 'refined', 'Lingot de base en cuivre'),
('caterium_ingot', 'Lingot de caterium', 'refined', 'Lingot avancé de caterium'),
('steel_ingot', 'Lingot d''acier', 'refined', 'Alliage de fer et charbon'),
('aluminum_ingot', 'Lingot d''aluminium', 'refined', 'Lingot léger et résistant'),
('quartz_crystal', 'Cristal de quartz', 'refined', 'Cristal utilisé pour l''électronique'),
-- Pièces basiques
('iron_rod', 'Tige de fer', 'component', 'Composant de base en fer'),
('iron_plate', 'Plaque de fer', 'component', 'Plaque de base en fer'),
('copper_sheet', 'Feuille de cuivre', 'component', 'Feuille fine de cuivre'),
('concrete', 'Béton', 'component', 'Matériau de construction'),
('screw', 'Vis', 'component', 'Petite fixation'),
('wire', 'Câble', 'component', 'Câble conducteur basique'),
('cable', 'Câble électrique', 'component', 'Câble isolé pour l''électricité'),
('steel_beam', 'Poutre d''acier', 'component', 'Poutre de construction solide'),
('steel_pipe', 'Tuyau d''acier', 'component', 'Tuyau pour transport de fluides'),
-- Composants intermédiaires
('reinforced_iron_plate', 'Plaque de fer renforcée', 'component', 'Plaque renforcée avec vis'),
('rotor', 'Rotor', 'component', 'Composant rotatif'),
('modular_frame', 'Châssis modulaire', 'component', 'Structure de base modulaire'),
('smart_plating', 'Blindage intelligent', 'manufactured', 'Composant avancé'),
('versatile_framework', 'Châssis polyvalent', 'manufactured', 'Structure flexible'),
('automated_wiring', 'Câblage automatique', 'manufactured', 'Système de câblage'),
('stator', 'Stator', 'component', 'Composant électromagnétique'),
('motor', 'Moteur', 'component', 'Moteur électrique'),
('heavy_modular_frame', 'Châssis modulaire lourd', 'manufactured', 'Structure renforcée'),
('encased_industrial_beam', 'Poutre industrielle blindée', 'component', 'Poutre très solide'),
('computer', 'Ordinateur', 'manufactured', 'Composant électronique avancé'),
('circuit_board', 'Circuit imprimé', 'component', 'Carte électronique de base'),
('plastic', 'Plastique', 'refined', 'Matériau synthétique'),
('rubber', 'Caoutchouc', 'refined', 'Matériau élastique'),
('fuel', 'Carburant', 'refined', 'Combustible liquide'),
('quickwire', 'Fil rapide', 'component', 'Câble haute vitesse'),
('ai_limiter', 'Limiteur IA', 'component', 'Composant de contrôle IA'),
('high_speed_connector', 'Connecteur haute vitesse', 'component', 'Connecteur rapide'),
('supercomputer', 'Super-ordinateur', 'manufactured', 'Ordinateur très puissant'),
('modular_engine', 'Moteur modulaire', 'manufactured', 'Moteur polyvalent'),
('adaptive_control_unit', 'Unité de contrôle adaptative', 'manufactured', 'Système de contrôle avancé'),
('silica', 'Silice', 'refined', 'Verre de base'),
('black_powder', 'Poudre noire', 'component', 'Explosif de base'),
('aluminum_scrap', 'Ferraille d''aluminium', 'component', 'Résidu d''aluminium'),
('alumina_solution', 'Solution d''alumine', 'refined', 'Solution pour aluminium'),
('sulfuric_acid', 'Acide sulfurique', 'refined', 'Acide industriel'),
('battery', 'Batterie', 'component', 'Stockage d''énergie'),
('electromagnetic_control_rod', 'Tige de contrôle électromagnétique', 'component', 'Contrôle nucléaire'),
('uranium_pellet', 'Pastille d''uranium', 'refined', 'Combustible nucléaire'),
('encased_uranium_cell', 'Cellule d''uranium blindée', 'component', 'Conteneur nucléaire'),
('uranium_fuel_rod', 'Barre de combustible uranium', 'manufactured', 'Combustible réacteur'),
('cooling_system', 'Système de refroidissement', 'manufactured', 'Refroidissement industriel'),
('turbo_motor', 'Turbo moteur', 'manufactured', 'Moteur haute performance'),
('radio_control_unit', 'Unité de contrôle radio', 'manufactured', 'Système de communication'),
('crystal_oscillator', 'Oscillateur à cristal', 'manufactured', 'Composant de précision'),
('pressure_conversion_cube', 'Cube de conversion de pression', 'manufactured', 'Convertisseur de pression'),
('fused_modular_frame', 'Châssis modulaire fusionné', 'manufactured', 'Châssis ultra-résistant'),
('thermal_propulsion_rocket', 'Fusée à propulsion thermique', 'manufactured', 'Composant de fusée'),
('nuclear_pasta', 'Pâte nucléaire', 'special', 'Matériau extrême');

-- RECETTES DE BASE (non-alternatives)

-- === FONDERIE (Smelter) ===
DO $$
DECLARE
  v_smelter_id UUID;
  v_constructor_id UUID;
  v_assembler_id UUID;
  v_foundry_id UUID;
  v_manufacturer_id UUID;
  v_refinery_id UUID;
  v_recipe_id UUID;
BEGIN
  SELECT id INTO v_smelter_id FROM buildings WHERE name = 'smelter';
  SELECT id INTO v_constructor_id FROM buildings WHERE name = 'constructor';
  SELECT id INTO v_assembler_id FROM buildings WHERE name = 'assembler';
  SELECT id INTO v_foundry_id FROM buildings WHERE name = 'foundry';
  SELECT id INTO v_manufacturer_id FROM buildings WHERE name = 'manufacturer';
  SELECT id INTO v_refinery_id FROM buildings WHERE name = 'refinery';

  -- Lingot de fer (30 minerai -> 30 lingot en 2 sec = 60/min)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('iron_ingot', 'Lingot de fer', v_smelter_id, 2, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'iron_ore'), 30);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_ingot'), 30);

  -- Lingot de cuivre (30 minerai -> 30 lingot en 2 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('copper_ingot', 'Lingot de cuivre', v_smelter_id, 2, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'copper_ore'), 30);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'copper_ingot'), 30);

  -- Lingot de caterium (45 minerai -> 15 lingot en 4 sec = 225/min minerai -> 75/min lingot)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('caterium_ingot', 'Lingot de caterium', v_smelter_id, 4, 'tier_2') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'caterium_ore'), 45);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'caterium_ingot'), 15);

  -- Cristal de quartz (5 quartz brut -> 3 cristal en 8 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('quartz_crystal', 'Cristal de quartz', v_constructor_id, 8, 'tier_2') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'raw_quartz'), 5);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'quartz_crystal'), 3);

  -- === CONSTRUCTEUR (Constructor) ===
  
  -- Tige de fer (1 lingot -> 1 tige en 4 sec = 15/min)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('iron_rod', 'Tige de fer', v_constructor_id, 4, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_ingot'), 1);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_rod'), 1);

  -- Plaque de fer (3 lingot -> 2 plaque en 6 sec = 30/min lingot -> 20/min plaque)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('iron_plate', 'Plaque de fer', v_constructor_id, 6, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_ingot'), 3);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_plate'), 2);

  -- Feuille de cuivre (2 lingot -> 1 feuille en 6 sec = 20/min lingot -> 10/min feuille)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('copper_sheet', 'Feuille de cuivre', v_constructor_id, 6, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'copper_ingot'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'copper_sheet'), 1);

  -- Béton (3 calcaire -> 1 béton en 4 sec = 45/min calcaire -> 15/min béton)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('concrete', 'Béton', v_constructor_id, 4, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'limestone'), 3);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'concrete'), 1);

  -- Vis (1 tige -> 4 vis en 6 sec = 10/min tige -> 40/min vis)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('screw', 'Vis', v_constructor_id, 6, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_rod'), 1);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'screw'), 4);

  -- Câble (2 lingot cuivre -> 2 câble en 4 sec = 30/min lingot -> 30/min câble)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('wire', 'Câble', v_constructor_id, 4, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'copper_ingot'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'wire'), 2);

  -- Câble électrique (2 câble -> 1 câble électrique en 4 sec = 30/min câble -> 15/min câble élec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('cable', 'Câble électrique', v_constructor_id, 4, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'wire'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'cable'), 1);

  -- Fil rapide (1 lingot caterium -> 5 fil en 4 sec = 15/min lingot -> 75/min fil)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('quickwire', 'Fil rapide', v_constructor_id, 4, 'tier_2') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'caterium_ingot'), 1);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'quickwire'), 5);

  -- Poutre d'acier (4 lingot acier -> 1 poutre en 4 sec = 60/min lingot -> 15/min poutre)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('steel_beam', 'Poutre d''acier', v_constructor_id, 4, 'tier_3') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_ingot'), 4);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_beam'), 1);

  -- Tuyau d'acier (3 lingot acier -> 2 tuyau en 6 sec = 30/min lingot -> 20/min tuyau)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('steel_pipe', 'Tuyau d''acier', v_constructor_id, 6, 'tier_3') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_ingot'), 3);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_pipe'), 2);

  -- Silice (3 quartz brut -> 5 silice en 8 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('silica', 'Silice', v_constructor_id, 8, 'tier_5') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'raw_quartz'), 3);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'silica'), 5);

  -- === ASSEMBLEUR (Assembler) ===

  -- Plaque de fer renforcée (6 plaque + 12 vis -> 1 renforcée en 12 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('reinforced_iron_plate', 'Plaque de fer renforcée', v_assembler_id, 12, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_plate'), 6);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'screw'), 12);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'reinforced_iron_plate'), 1);

  -- Rotor (5 tige + 25 vis -> 1 rotor en 15 sec = 20/min tige + 100/min vis -> 4/min rotor)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('rotor', 'Rotor', v_assembler_id, 15, 'tier_0') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_rod'), 5);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'screw'), 25);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'rotor'), 1);

  -- Châssis modulaire (3 renforcée + 12 tige -> 2 châssis en 60 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('modular_frame', 'Châssis modulaire', v_assembler_id, 60, 'tier_2') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'reinforced_iron_plate'), 3);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_rod'), 12);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'modular_frame'), 2);

  -- Stator (3 poutre acier + 8 câble -> 1 stator en 12 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('stator', 'Stator', v_assembler_id, 12, 'tier_4') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_beam'), 3);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'wire'), 8);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'stator'), 1);

  -- Moteur (2 rotor + 2 stator -> 1 moteur en 12 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('motor', 'Moteur', v_assembler_id, 12, 'tier_4') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'rotor'), 2);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'stator'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'motor'), 1);

  -- Poutre industrielle blindée (6 poutre acier + 5 béton -> 1 poutre blindée en 10 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('encased_industrial_beam', 'Poutre industrielle blindée', v_assembler_id, 10, 'tier_4') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_beam'), 6);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'concrete'), 5);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'encased_industrial_beam'), 1);

  -- Circuit imprimé (2 feuille cuivre + 4 plastique -> 1 circuit en 8 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('circuit_board', 'Circuit imprimé', v_assembler_id, 8, 'tier_5') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'copper_sheet'), 2);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'plastic'), 4);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'circuit_board'), 1);

  -- Limiteur IA (5 fil rapide + 20 circuit imprimé -> 1 limiteur en 12 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('ai_limiter', 'Limiteur IA', v_assembler_id, 12, 'tier_5') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'quickwire'), 5);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'circuit_board'), 20);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'ai_limiter'), 1);

  -- Connecteur haute vitesse (56 fil rapide + 10 câble + 1 circuit -> 1 connecteur en 16 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('high_speed_connector', 'Connecteur haute vitesse', v_assembler_id, 16, 'tier_6') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'quickwire'), 56);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'cable'), 10);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'circuit_board'), 1);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'high_speed_connector'), 1);

  -- Batterie (2.5 solution alumine + 2 acide sulfurique -> 1 batterie + 1.5 eau en 3 sec)
  -- Note: simplifié sans les outputs liquides pour l'instant
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('battery', 'Batterie', v_blender_id, 3, 'tier_7') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'alumina_solution'), 2.5);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'sulfuric_acid'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'battery'), 1);

  -- === FORGE (Foundry) ===

  -- Lingot d'acier (3 fer + 3 charbon -> 3 acier en 4 sec = 45/min fer + 45/min charbon -> 45/min acier)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('steel_ingot', 'Lingot d''acier', v_foundry_id, 4, 'tier_3') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'iron_ingot'), 3);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'coal'), 3);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_ingot'), 3);

  -- === FABRICANT (Manufacturer) ===

  -- Ordinateur (10 circuit + 9 câble + 18 plastique + 45 vis -> 1 ordi en 24 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('computer', 'Ordinateur', v_manufacturer_id, 24, 'tier_5') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'circuit_board'), 10);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'cable'), 9);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'plastic'), 18);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'screw'), 45);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'computer'), 1);

  -- Châssis modulaire lourd (5 châssis + 15 poutre acier + 5 poutre blindée + 90 vis -> 1 lourd en 30 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('heavy_modular_frame', 'Châssis modulaire lourd', v_manufacturer_id, 30, 'tier_4') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'modular_frame'), 5);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_beam'), 15);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'encased_industrial_beam'), 5);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'screw'), 90);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'heavy_modular_frame'), 1);

  -- Super-ordinateur (2 ordi + 2 limiteur IA + 3 connecteur haute vitesse + 28 plastique -> 1 super-ordi en 32 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('supercomputer', 'Super-ordinateur', v_manufacturer_id, 32, 'tier_7') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'computer'), 2);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'ai_limiter'), 2);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'high_speed_connector'), 3);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'plastic'), 28);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'supercomputer'), 1);

  -- Moteur modulaire (2 moteur + 15 caoutchouc + 2 smart plating -> 1 moteur modulaire en 60 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('modular_engine', 'Moteur modulaire', v_manufacturer_id, 60, 'tier_7') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'motor'), 2);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'rubber'), 15);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'smart_plating'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'modular_engine'), 1);

  -- Blindage intelligent (1 renforcée + 1 rotor -> 1 smart plating en 30 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('smart_plating', 'Blindage intelligent', v_assembler_id, 30, 'tier_2') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'reinforced_iron_plate'), 1);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'rotor'), 1);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'smart_plating'), 1);

  -- Châssis polyvalent (1 châssis + 12 poutre acier -> 2 polyvalent en 24 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('versatile_framework', 'Châssis polyvalent', v_assembler_id, 24, 'tier_3') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'modular_frame'), 1);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'steel_beam'), 12);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'versatile_framework'), 2);

  -- Câblage automatique (1 stator + 20 câble -> 1 câblage auto en 24 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('automated_wiring', 'Câblage automatique', v_assembler_id, 24, 'tier_4') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'stator'), 1);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'cable'), 20);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'automated_wiring'), 1);

  -- === RAFFINERIE (Refinery) ===

  -- Plastique (3 pétrole brut -> 2 plastique + 1 carburant lourd en 6 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('plastic', 'Plastique', v_refinery_id, 6, 'tier_5') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'crude_oil'), 3);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'plastic'), 2);

  -- Caoutchouc (3 pétrole brut -> 2 caoutchouc + 2 carburant lourd en 6 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('rubber', 'Caoutchouc', v_refinery_id, 6, 'tier_5') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'crude_oil'), 3);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'rubber'), 2);

  -- Carburant (6 pétrole brut -> 4 carburant + 1.5 résidu polymère en 6 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('fuel', 'Carburant', v_refinery_id, 6, 'tier_5') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'crude_oil'), 6);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'fuel'), 4);

  -- Acide sulfurique (5 soufre + 5 eau -> 5 acide en 6 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('sulfuric_acid', 'Acide sulfurique', v_refinery_id, 6, 'tier_7') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'sulfur'), 5);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'water'), 5);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'sulfuric_acid'), 5);

  -- Solution d'alumine (12 bauxite + 18 eau -> 12 solution + 5 silice en 6 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('alumina_solution', 'Solution d''alumine', v_refinery_id, 6, 'tier_7') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'bauxite'), 12);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'water'), 18);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'alumina_solution'), 12);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'silica'), 5);

  -- Ferraille d'aluminium (4 solution alumine + 2 charbon -> 6 ferraille + 2 eau en 1 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('aluminum_scrap', 'Ferraille d''aluminium', v_refinery_id, 1, 'tier_7') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'alumina_solution'), 4);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'coal'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'aluminum_scrap'), 6);

  -- Lingot d'aluminium (6 ferraille + 5 silice -> 4 lingot en 4 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('aluminum_ingot', 'Lingot d''aluminium', v_foundry_id, 4, 'tier_7') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'aluminum_scrap'), 6);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'silice'), 5);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'aluminum_ingot'), 4);

  -- Poudre noire (1 charbon + 2 soufre -> 2 poudre en 4 sec)
  INSERT INTO recipes (name, display_name, building_id, production_time, tier)
  VALUES ('black_powder', 'Poudre noire', v_assembler_id, 4, 'tier_2') RETURNING id INTO v_recipe_id;
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'coal'), 1);
  INSERT INTO recipe_ingredients (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM resources WHERE name = 'sulfur'), 2);
  INSERT INTO recipe_products (recipe_id, item_id, quantity)
  VALUES (v_recipe_id, (SELECT id FROM items WHERE name = 'black_powder'), 2);

END $$;

-- Fonction pour calculer le débit de production (items/min)
CREATE OR REPLACE FUNCTION calculate_production_rate(
  p_recipe_id UUID,
  p_building_count INTEGER,
  p_overclock_percentage INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
  v_production_time NUMERIC;
  v_product_quantity NUMERIC;
  v_rate NUMERIC;
BEGIN
  -- Récupérer le temps de production et la quantité du premier produit
  SELECT r.production_time, rp.quantity
  INTO v_production_time, v_product_quantity
  FROM recipes r
  JOIN recipe_products rp ON rp.recipe_id = r.id
  WHERE r.id = p_recipe_id
  LIMIT 1;
  
  -- Calculer le débit: (quantité / temps) * 60 * (overclock/100) * nombre de bâtiments
  v_rate := (v_product_quantity / v_production_time) * 60 * (p_overclock_percentage::NUMERIC / 100) * p_building_count;
  
  RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le débit d'extraction (items/min)
CREATE OR REPLACE FUNCTION calculate_extraction_rate(
  p_base_rate NUMERIC,
  p_purity TEXT,
  p_overclock_percentage INTEGER,
  p_quantity INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
  v_purity_multiplier NUMERIC;
  v_rate NUMERIC;
BEGIN
  -- Multiplicateur selon la pureté du nœud
  CASE p_purity
    WHEN 'impure' THEN v_purity_multiplier := 0.5;
    WHEN 'normal' THEN v_purity_multiplier := 1.0;
    WHEN 'pure' THEN v_purity_multiplier := 2.0;
    ELSE v_purity_multiplier := 1.0;
  END CASE;
  
  -- Calculer: base * pureté * (overclock/100) * quantité
  v_rate := p_base_rate * v_purity_multiplier * (p_overclock_percentage::NUMERIC / 100) * p_quantity;
  
  RETURN v_rate;
END;
$$ LANGUAGE plpgsql;
