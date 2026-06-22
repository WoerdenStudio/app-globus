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
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

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
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.byPickup}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.byZone}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {stats.byZone.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
