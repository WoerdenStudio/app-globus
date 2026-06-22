import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedSupabaseClient = SupabaseClient<any>;

/** Crée un client Supabase typé (côté navigateur ou serveur) */
export function createSupabaseClient(
  url: string,
  key: string,
  options?: Parameters<typeof createClient>[2],
): TypedSupabaseClient {
  return createClient<Database>(url, key, options) as TypedSupabaseClient;
}

/** Crée un client Supabase pour le navigateur (avec auth persistée) */
export function createBrowserClient(url: string, anonKey: string): TypedSupabaseClient {
  return createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/** Crée un client Supabase côté serveur (sans persistance) */
export function createServerClient(url: string, key: string): TypedSupabaseClient {
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
