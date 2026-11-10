import type { TypedSupabaseClient } from './client';
import type { Profile, Resource, Building, Item, Recipe } from '../types';

/** Récupère le profil de l'utilisateur connecté */
export async function getProfile(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

/** Récupère toutes les ressources */
export async function getAllResources(client: TypedSupabaseClient): Promise<Resource[]> {
  const { data, error } = await client
    .from('resources')
    .select('*')
    .order('display_name');

  if (error) throw error;
  return (data ?? []) as Resource[];
}

/** Récupère tous les bâtiments */
export async function getAllBuildings(client: TypedSupabaseClient): Promise<Building[]> {
  const { data, error } = await client
    .from('buildings')
    .select('*')
    .order('display_name');

  if (error) throw error;
  return (data ?? []) as Building[];
}

/** Récupère tous les items */
export async function getAllItems(client: TypedSupabaseClient): Promise<Item[]> {
  const { data, error } = await client
    .from('items')
    .select('*')
    .order('display_name');

  if (error) throw error;
  return (data ?? []) as Item[];
}

/** Récupère toutes les recettes */
export async function getAllRecipes(client: TypedSupabaseClient): Promise<Recipe[]> {
  const { data, error } = await client
    .from('recipes')
    .select('*')
    .order('display_name');

  if (error) throw error;
  return (data ?? []) as Recipe[];
}
