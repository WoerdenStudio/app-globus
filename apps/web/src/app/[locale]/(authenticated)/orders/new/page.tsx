import { getTranslations } from 'next-intl/server';
import {
  getActivePickupLocations,
  getActivePricingRule,
  getAppSettings,
  getEnabledDeliveryOptions,
  getShowPricingEnabled,
} from '@globus/core/supabase';
import { requireAuth } from '@/lib/auth';
import { OrderForm } from '@/components/orders/order-form';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase } = await requireAuth(locale);
  const t = await getTranslations('order');

  const [pickupLocations, settings, pricingRule, deliveryOptions, showPricing] = await Promise.all([
    getActivePickupLocations(supabase),
    getAppSettings(supabase),
    getActivePricingRule(supabase),
    getEnabledDeliveryOptions(supabase),
    getShowPricingEnabled(supabase),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <OrderForm
        locale={locale}
        pickupLocations={pickupLocations}
        settings={settings}
        pricingRule={pricingRule}
        deliveryOptions={deliveryOptions}
        showPricing={showPricing}
      />
    </div>
  );
}
