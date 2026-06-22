import { getTranslations } from 'next-intl/server';
import { getActivePickupLocations } from '@globus/core/supabase';
import { requireAuth } from '@/lib/auth';
import { OrderReview } from '@/components/orders/order-review';

export default async function ReviewOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase } = await requireAuth(locale);
  const t = await getTranslations('order');
  const pickupLocations = await getActivePickupLocations(supabase);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('reviewTitle')}</h1>
      <OrderReview locale={locale} pickupLocations={pickupLocations} />
    </div>
  );
}
