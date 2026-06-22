'use client';

import { createBrowserClient as createCoreBrowserClient } from '@globus/core/supabase';

let client: ReturnType<typeof createCoreBrowserClient> | null = null;

export function createBrowserClient() {
  if (!client) {
    client = createCoreBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
