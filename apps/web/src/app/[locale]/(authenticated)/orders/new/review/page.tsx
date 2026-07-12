import { getTranslations } from 'next-intl/server';
import {
  getActivePickupLocations,
  getAppSettings,
  getShowPricingEnabled,
} from '@globus/core/supabase';
import { requireAuth } from '@/lib/auth';
import { OrderReview } from '@/components/orders/order-review';

export const dynamic = 'force-dynamic';

export default async function ReviewOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase } = await requireAuth(locale);
  const t = await getTranslations('order');
  const [pickupLocations, showPricing, settings] = await Promise.all([
    getActivePickupLocations(supabase),
    getShowPricingEnabled(supabase),
    getAppSettings(supabase),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('reviewTitle')}</h1>
      <OrderReview
        locale={locale}
        pickupLocations={pickupLocations}
        showPricing={showPricing}
        operatingHours={settings.operating_hours}
      />
    </div>
  );
}
