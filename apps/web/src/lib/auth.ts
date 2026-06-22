import { getProfile } from '@globus/core/supabase';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requireAuth(locale: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile || !profile.active) {
    redirect(`/${locale}/login`);
  }

  return { user, profile, supabase };
}

export async function requireAdmin(locale: string) {
  const { user, profile, supabase } = await requireAuth(locale);

  if (profile.role !== 'admin') {
    redirect(`/${locale}/orders/new`);
  }

  return { user, profile, supabase };
}
