'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Order, PickupLocation } from '@globus/core/types';
import { getEffectiveOrderStatus } from '@globus/core/business';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { formatCHF, formatDate, formatDateTime } from '@/lib/utils';

interface OrdersListProps {
  locale: string;
  orders: Order[];
  pickupLocations: PickupLocation[];
  showPricing: boolean;
}

/** Normalise un texte pour la recherche (minuscules, sans accents) */
function normalizeSearch(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function OrdersList({ locale, orders, pickupLocations, showPricing }: OrdersListProps) {
  const t = useTranslations();
  const [statusFilter, setStatusFilter] = useState('all');
  const [pickupFilter, setPickupFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Recherche libre : destinataire, rue, ou numéro de commande (id / réf. Logtech)
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = orders.filter((order) => {
    const effectiveStatus = getEffectiveOrderStatus(order);
    if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
    if (pickupFilter !== 'all' && order.pickup_location_id !== pickupFilter) return false;
    if (dateFrom && order.created_at < dateFrom) return false;
    if (dateTo && order.created_at > dateTo + 'T23:59:59') return false;

    const query = normalizeSearch(searchQuery);
    if (query) {
      const inClientName = normalizeSearch(order.client_name).includes(query);
      const inAddress = normalizeSearch(order.delivery_address).includes(query);
      // On cherche aussi dans l'identifiant interne et la référence Vélopostale
      const inOrderId = normalizeSearch(order.id).includes(query);
      const inLogtechRef = normalizeSearch(order.logtech_ref).includes(query);
      if (!inClientName && !inAddress && !inOrderId && !inLogtechRef) return false;
    }

    return true;
  });

  /** Affiche un numéro court lisible (début de l'id) */
  function shortOrderNumber(order: Order): string {
    return order.id.slice(0, 8).toUpperCase();
  }

  function getPickupLabel(order: Order) {
    if (order.pickup_address_custom) return order.pickup_address_custom;
    return pickupLocations.find((l) => l.id === order.pickup_location_id)?.label ?? '—';
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orders-search">{t('order.filters.search')}</Label>
            <Input
              id="orders-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('order.filters.searchPlaceholder')}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('order.filters.status')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('order.filters.all')}</SelectItem>
                  {(['created', 'en_cours', 'livree', 'annulee'] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`order.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('order.filters.pickupLocation')}</Label>
              <Select value={pickupFilter} onValueChange={setPickupFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('order.filters.all')}</SelectItem>
                  {pickupLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('order.filters.dateFrom')}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('order.filters.dateTo')}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            return (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">
                        {t('order.filters.orderNumber', { number: shortOrderNumber(order) })}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(order.created_at)}</span>
                    </div>
                    {order.client_name && (
                      <p className="text-sm font-medium">{order.client_name}</p>
                    )}
                    <p className="font-medium">{order.delivery_address}</p>
                    <p className="text-sm text-muted-foreground">
                      {getPickupLabel(order)}
                      {order.requested_date && ` — ${formatDate(order.requested_date)}`}
                      {order.requested_time_slot && ` (${order.requested_time_slot})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {showPricing && (
                      <span className="font-semibold">{formatCHF(order.price_chf)}</span>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/${locale}/orders/${order.id}`}>{t('common.detail')}</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
