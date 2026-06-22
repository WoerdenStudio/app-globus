import { getTranslations } from 'next-intl/server';
import type { Order } from '@globus/core/types';
import { getActivePickupLocations } from '@globus/core/supabase';
import { requireAuth } from '@/lib/auth';
import { OrdersList } from '@/components/orders/orders-list';

export default async function OrdersHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase } = await requireAuth(locale);
  const t = await getTranslations('order');

  const [{ data: orders }, pickupLocations] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    getActivePickupLocations(supabase),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('historyTitle')}</h1>
      <OrdersList
        locale={locale}
        orders={(orders ?? []) as Order[]}
        pickupLocations={pickupLocations}
      />
    </div>
  );
}
