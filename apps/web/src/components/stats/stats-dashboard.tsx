'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Order, PickupLocation } from '@globus/core/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCHF } from '@/lib/utils';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  isAfter,
  differenceInHours,
} from 'date-fns';

interface StatsDashboardProps {
  orders: Order[];
  pickupLocations: PickupLocation[];
}

const COLORS = ['#334155', '#64748b', '#94a3b8', '#cbd5e1', '#2563eb', '#16a34a'];
const PICKUP_BAR_COLOR = '#334155';

type BreakdownDatum = { name: string; count: number };

function itemPercent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function StatsBreakdownList({
  items,
  total,
  ariaLabel,
  detailLabel,
}: {
  items: BreakdownDatum[];
  total: number;
  ariaLabel: string;
  detailLabel: (count: number, percent: number) => string;
}) {
  return (
    <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1" aria-label={ariaLabel}>
      {items.map((item, i) => {
        const percent = itemPercent(item.count, total);

        return (
          <li key={item.name} className="flex items-start gap-2 text-sm">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 break-words">{item.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {detailLabel(item.count, percent)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ZonePieTooltip({
  active,
  payload,
  total,
  detailLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: BreakdownDatum }>;
  total: number;
  detailLabel: (count: number, percent: number) => string;
}) {
  const first = payload?.[0]?.payload;
  if (!active || !first) return null;

  const zone = first;
  const percent = itemPercent(zone.count, total);

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{zone.name}</p>
      <p className="text-muted-foreground">{detailLabel(zone.count, percent)}</p>
    </div>
  );
}

export function StatsDashboard({ orders, pickupLocations }: StatsDashboardProps) {
  const t = useTranslations('stats');
  const now = new Date();

  function filterByPeriod(period: 'day' | 'week' | 'month' | 'year') {
    const starts = {
      day: startOfDay(now),
      week: startOfWeek(now, { weekStartsOn: 1 }),
      month: startOfMonth(now),
      year: startOfYear(now),
    };
    return orders.filter((o) => isAfter(new Date(o.created_at), starts[period]));
  }

  function computeStats(periodOrders: Order[]) {
    const totalRevenue = periodOrders.reduce((sum, o) => sum + (Number(o.price_chf) || 0), 0);

    const byPickup = pickupLocations.map((loc) => ({
      name: loc.label,
      count: periodOrders.filter((o) => o.pickup_location_id === loc.id).length,
    })).filter((d) => d.count > 0);

    const otherCount = periodOrders.filter((o) => o.pickup_address_custom).length;
    if (otherCount > 0) {
      byPickup.push({ name: 'Autres', count: otherCount });
    }

    // Zones simplifiées : premiers mots de l'adresse de livraison
    const zoneMap = new Map<string, number>();
    periodOrders.forEach((o) => {
      const zone = o.delivery_address.split(/[,\n]/)[0]?.trim().slice(0, 30) ?? 'Inconnu';
      zoneMap.set(zone, (zoneMap.get(zone) ?? 0) + 1);
    });
    const byZone = Array.from(zoneMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const delivered = periodOrders.filter((o) => o.status === 'livree');
    const avgDeliveryHours =
      delivered.length > 0
        ? delivered.reduce((sum, o) => {
            const hours = differenceInHours(new Date(o.updated_at), new Date(o.created_at));
            return sum + Math.max(hours, 0);
          }, 0) / delivered.length
        : 0;

    return {
      count: periodOrders.length,
      totalRevenue,
      byPickup,
      byZone,
      avgDeliveryHours,
    };
  }

  function PeriodContent({ period }: { period: 'day' | 'week' | 'month' | 'year' }) {
    const stats = computeStats(filterByPeriod(period));

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalOrders')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalRevenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCHF(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('avgDeliveryTime')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stats.avgDeliveryHours.toFixed(1)} {t('hours')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('byPickup')}</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byPickup.length === 0 ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.byPickup}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        formatter={(value) => {
                          const count = Number(value);
                          const percent = itemPercent(count, stats.count);
                          return [t('statItemDetail', { count, percent }), t('totalOrders')];
                        }}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar dataKey="count" fill={PICKUP_BAR_COLOR} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <StatsBreakdownList
                    items={stats.byPickup}
                    total={stats.count}
                    ariaLabel={t('byPickup')}
                    detailLabel={(count, percent) => t('statItemDetail', { count, percent })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('byZone')}</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byZone.length === 0 ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.byZone}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        paddingAngle={1}
                      >
                        {stats.byZone.map((entry, i) => (
                          <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <ZonePieTooltip
                            total={stats.count}
                            detailLabel={(count, percent) =>
                              t('statItemDetail', { count, percent })
                            }
                          />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <StatsBreakdownList
                    items={stats.byZone}
                    total={stats.count}
                    ariaLabel={t('byZone')}
                    detailLabel={(count, percent) => t('statItemDetail', { count, percent })}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="month">
      <TabsList>
        <TabsTrigger value="day">{t('period.day')}</TabsTrigger>
        <TabsTrigger value="week">{t('period.week')}</TabsTrigger>
        <TabsTrigger value="month">{t('period.month')}</TabsTrigger>
        <TabsTrigger value="year">{t('period.year')}</TabsTrigger>
      </TabsList>
      <TabsContent value="day">
        <PeriodContent period="day" />
      </TabsContent>
      <TabsContent value="week">
        <PeriodContent period="week" />
      </TabsContent>
      <TabsContent value="month">
        <PeriodContent period="month" />
      </TabsContent>
      <TabsContent value="year">
        <PeriodContent period="year" />
      </TabsContent>
    </Tabs>
  );
}
