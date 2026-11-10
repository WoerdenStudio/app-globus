// Types de base de données pour FicsitManager

export type ResourceType = 'raw' | 'ore' | 'refined' | 'manufactured' | 'component' | 'special';
export type BuildingType = 'miner' | 'constructor' | 'assembler' | 'foundry' | 'smelter' | 'manufacturer' | 'refinery' | 'packager' | 'blender';
export type RecipeTier = 'tier_0' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | 'tier_6' | 'tier_7' | 'tier_8';
export type Purity = 'impure' | 'normal' | 'pure';

export interface Profile {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  name: string;
  display_name: string;
  type: ResourceType;
  description: string | null;
  created_at: string;
}

export interface Building {
  id: string;
  name: string;
  display_name: string;
  type: BuildingType;
  power_consumption: number;
  description: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  display_name: string;
  type: ResourceType;
  description: string | null;
  created_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  display_name: string;
  building_id: string;
  is_alternate: boolean;
  production_time: number;
  tier: RecipeTier;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
}

export interface RecipeProduct {
  id: string;
  recipe_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
}

export interface UserFactory {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserExtractor {
  id: string;
  factory_id: string;
  resource_id: string;
  building_id: string;
  quantity: number;
  purity: Purity;
  overclock_percentage: number;
  extraction_rate: number;
  created_at: string;
  updated_at: string;
}

export interface UserProductionLine {
  id: string;
  factory_id: string;
  recipe_id: string;
  building_count: number;
  overclock_percentage: number;
  production_rate: number;
  created_at: string;
  updated_at: string;
}

// Types étendus avec relations
export interface UserExtractorWithDetails extends UserExtractor {
  resource: Resource;
  building: Building;
}

export interface UserProductionLineWithDetails extends UserProductionLine {
  recipe: Recipe & {
    building: Building;
    ingredients: (RecipeIngredient & { item: Item })[];
    products: (RecipeProduct & { item: Item })[];
  };
}

export interface UserFactoryWithDetails extends UserFactory {
  extractors: UserExtractorWithDetails[];
  production_lines: UserProductionLineWithDetails[];
}

// Types pour les calculs
export interface ProductionBalance {
  item_id: string;
  item_name: string;
  item_display_name: string;
  produced: number;
  consumed: number;
  net: number;
  status: 'surplus' | 'deficit' | 'balanced';
}

export interface BuildingRecommendation {
  recipe_id: string;
  recipe_name: string;
  current_count: number;
  recommended_count: number;
  difference: number;
  action: 'add' | 'remove' | 'keep';
}

// Database helper types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, 'id' | 'created_at'>;
        Update: Partial<Omit<Resource, 'id' | 'created_at'>>;
      };
      buildings: {
        Row: Building;
        Insert: Omit<Building, 'id' | 'created_at'>;
        Update: Partial<Omit<Building, 'id' | 'created_at'>>;
      };
      items: {
        Row: Item;
        Insert: Omit<Item, 'id' | 'created_at'>;
        Update: Partial<Omit<Item, 'id' | 'created_at'>>;
      };
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at'>;
        Update: Partial<Omit<Recipe, 'id' | 'created_at'>>;
      };
      recipe_ingredients: {
        Row: RecipeIngredient;
        Insert: Omit<RecipeIngredient, 'id' | 'created_at'>;
        Update: Partial<Omit<RecipeIngredient, 'id' | 'created_at'>>;
      };
      recipe_products: {
        Row: RecipeProduct;
        Insert: Omit<RecipeProduct, 'id' | 'created_at'>;
        Update: Partial<Omit<RecipeProduct, 'id' | 'created_at'>>;
      };
      user_factories: {
        Row: UserFactory;
        Insert: Omit<UserFactory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserFactory, 'id' | 'created_at' | 'user_id'>>;
      };
      user_extractors: {
        Row: UserExtractor;
        Insert: Omit<UserExtractor, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserExtractor, 'id' | 'created_at'>>;
      };
      user_production_lines: {
        Row: UserProductionLine;
        Insert: Omit<UserProductionLine, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProductionLine, 'id' | 'created_at'>>;
      };
    };
    Views: {};
    Functions: {
      calculate_production_rate: {
        Args: {
          p_recipe_id: string;
          p_building_count: number;
          p_overclock_percentage: number;
        };
        Returns: number;
      };
      calculate_extraction_rate: {
        Args: {
          p_base_rate: number;
          p_purity: Purity;
          p_overclock_percentage: number;
          p_quantity: number;
        };
        Returns: number;
      };
    };
    Enums: {
      resource_type: ResourceType;
      building_type: BuildingType;
      recipe_tier: RecipeTier;
      purity: Purity;
    };
  };
}
