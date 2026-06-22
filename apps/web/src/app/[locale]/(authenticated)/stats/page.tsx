import { getTranslations } from 'next-intl/server';
import type { Order } from '@globus/core/types';
import { getActivePickupLocations } from '@globus/core/supabase';
import { requireAuth } from '@/lib/auth';
import { StatsDashboard } from '@/components/stats/stats-dashboard';

export default async function StatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase } = await requireAuth(locale);
  const t = await getTranslations('stats');

  const [{ data: orders }, pickupLocations] = await Promise.all([
    supabase.from('orders').select('*'),
    getActivePickupLocations(supabase),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <StatsDashboard orders={(orders ?? []) as Order[]} pickupLocations={pickupLocations} />
    </div>
  );
}
