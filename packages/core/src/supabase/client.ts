import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export function createClient(url: string, key: string) {
  return createSupabaseClient<Database>(url, key);
}

export type TypedSupabaseClient = ReturnType<typeof createClient>;
