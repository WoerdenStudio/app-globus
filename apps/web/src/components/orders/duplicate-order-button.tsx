'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Copy } from 'lucide-react';
import type { Order } from '@globus/core/types';
import { orderToFormDraft } from '@globus/core/business';
import { Button } from '@/components/ui/button';
import {
  ORDER_DRAFT_KEY,
  ORDER_DUPLICATE_SOURCE_KEY,
} from '@/lib/order-draft';

interface DuplicateOrderButtonProps {
  locale: string;
  order: Order;
  /** Tarif de base pour initialiser le brouillon (recalculé ensuite dans le formulaire) */
  basePriceChf?: number;
}

/**
 * Reprend une commande passée et ouvre « Nouvelle commande » pré-remplie.
 */
export function DuplicateOrderButton({
  locale,
  order,
  basePriceChf = 25,
}: DuplicateOrderButtonProps) {
  const t = useTranslations('order');
  const router = useRouter();

  function handleDuplicate() {
    const draft = orderToFormDraft(order, basePriceChf);
    sessionStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(draft));
    sessionStorage.setItem(ORDER_DUPLICATE_SOURCE_KEY, order.created_at);
    router.push(`/${locale}/orders/new`);
  }

  return (
    <Button type="button" variant="outline" onClick={handleDuplicate}>
      <Copy className="mr-2 h-4 w-4" />
      {t('actions.duplicate')}
    </Button>
  );
}
