import { getTranslations } from 'next-intl/server';
import {
  getAppSettings,
  getActivePickupLocations,
} from '@globus/core/supabase';
import { requireAdmin } from '@/lib/auth';
import { AdminPanel } from '@/components/admin/admin-panel';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase } = await requireAdmin(locale);
  const t = await getTranslations('admin');

  const [settings, pickupLocations, { data: pricingRules }, { data: deliveryOptions }] =
    await Promise.all([
      getAppSettings(supabase),
      getActivePickupLocations(supabase),
      supabase.from('pricing_rules').select('*').order('created_at', { ascending: false }),
      supabase.from('delivery_options_config').select('*'),
    ]);

  // Admin needs all locations including inactive
  const { data: allLocations } = await supabase
    .from('pickup_locations')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <AdminPanel
        pricingRules={pricingRules ?? []}
        settings={settings}
        pickupLocations={allLocations ?? pickupLocations}
        deliveryOptions={deliveryOptions ?? []}
      />
    </div>
  );
}
