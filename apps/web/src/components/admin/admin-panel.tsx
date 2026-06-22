'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type {
  AppSettings,
  PickupLocation,
  PricingRule,
  DeliveryOptionConfig,
} from '@globus/core/types';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminPanelProps {
  pricingRules: PricingRule[];
  settings: AppSettings;
  pickupLocations: PickupLocation[];
  deliveryOptions: DeliveryOptionConfig[];
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function AdminPanel({
  pricingRules,
  settings: initialSettings,
  pickupLocations: initialLocations,
  deliveryOptions: initialOptions,
}: AdminPanelProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [pricing, setPricing] = useState(pricingRules[0] ?? null);
  const [settings, setSettings] = useState(initialSettings);
  const [locations, setLocations] = useState(initialLocations);
  const [options, setOptions] = useState(initialOptions);

  async function savePricing() {
    if (!pricing) return;
    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('pricing_rules')
      .update({
        label: pricing.label,
        base_price_chf: pricing.base_price_chf,
        modifiers: pricing.modifiers,
        active: pricing.active,
      })
      .eq('id', pricing.id);

    setSaving(false);
    setMessage(error ? 'Erreur' : t('saved'));
    router.refresh();
  }

  async function saveSettings() {
    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'app_settings', value: settings });

    setSaving(false);
    setMessage(error ? 'Erreur' : t('saved'));
    router.refresh();
  }

  async function saveLocation(loc: PickupLocation) {
    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('pickup_locations')
      .update({ label: loc.label, active: loc.active, sort_order: loc.sort_order })
      .eq('id', loc.id);

    setSaving(false);
    setMessage(error ? 'Erreur' : t('saved'));
    router.refresh();
  }

  async function addLocation() {
    setSaving(true);
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('pickup_locations')
      .insert({ label: 'Nouveau lieu', active: true, sort_order: locations.length + 1 })
      .select()
      .single();

    if (data && !error) {
      setLocations([...locations, data]);
    }
    setSaving(false);
    setMessage(error ? 'Erreur' : t('saved'));
    router.refresh();
  }

  async function saveOption(opt: DeliveryOptionConfig) {
    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('delivery_options_config')
      .update({ label: opt.label, enabled: opt.enabled })
      .eq('key', opt.key);

    setSaving(false);
    setMessage(error ? 'Erreur' : t('saved'));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Tabs defaultValue="pricing">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pricing">{t('tabs.pricing')}</TabsTrigger>
          <TabsTrigger value="hours">{t('tabs.hours')}</TabsTrigger>
          <TabsTrigger value="locations">{t('tabs.locations')}</TabsTrigger>
          <TabsTrigger value="options">{t('tabs.options')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>{t('tabs.pricing')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pricing && (
                <>
                  <div className="space-y-2">
                    <Label>{t('pricing.label')}</Label>
                    <Input
                      value={pricing.label}
                      onChange={(e) => setPricing({ ...pricing, label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('pricing.basePrice')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={pricing.base_price_chf}
                      onChange={(e) =>
                        setPricing({ ...pricing, base_price_chf: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={pricing.active}
                      onCheckedChange={(c) => setPricing({ ...pricing, active: !!c })}
                    />
                    <Label>{t('pricing.active')}</Label>
                  </div>
                  <Button onClick={savePricing} disabled={saving}>
                    {t('saved').replace('Modifications enregistrées', 'Enregistrer')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>{t('tabs.hours')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS.map((day) => (
                <div key={day} className="grid gap-2 sm:grid-cols-4 items-end border-b pb-3">
                  <span className="font-medium capitalize">{day}</span>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('hours.open')}</Label>
                    <Input
                      type="time"
                      value={settings.operating_hours[day].open}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          operating_hours: {
                            ...settings.operating_hours,
                            [day]: { ...settings.operating_hours[day], open: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('hours.close')}</Label>
                    <Input
                      type="time"
                      value={settings.operating_hours[day].close}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          operating_hours: {
                            ...settings.operating_hours,
                            [day]: { ...settings.operating_hours[day], close: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={settings.operating_hours[day].closed ?? false}
                      onCheckedChange={(c) =>
                        setSettings({
                          ...settings,
                          operating_hours: {
                            ...settings.operating_hours,
                            [day]: { ...settings.operating_hours[day], closed: !!c },
                          },
                        })
                      }
                    />
                    <Label className="text-xs">{t('hours.closed')}</Label>
                  </div>
                </div>
              ))}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('hours.weekdayCutoff')}</Label>
                  <Input
                    type="time"
                    value={settings.cutoffs.weekday}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cutoffs: { ...settings.cutoffs, weekday: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('hours.saturdayCutoff')}</Label>
                  <Input
                    type="time"
                    value={settings.cutoffs.saturday}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cutoffs: { ...settings.cutoffs, saturday: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('hours.globusEmail')}</Label>
                <Input
                  type="email"
                  value={settings.globus_notification_email}
                  onChange={(e) =>
                    setSettings({ ...settings, globus_notification_email: e.target.value })
                  }
                />
              </div>
              <Button onClick={saveSettings} disabled={saving}>
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('tabs.locations')}</CardTitle>
              <Button size="sm" onClick={addLocation} disabled={saving}>
                + Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {locations.map((loc, idx) => (
                <div key={loc.id} className="grid gap-2 sm:grid-cols-4 items-end border-b pb-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{t('locations.label')}</Label>
                    <Input
                      value={loc.label}
                      onChange={(e) => {
                        const updated = [...locations];
                        updated[idx] = { ...loc, label: e.target.value };
                        setLocations(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('locations.sortOrder')}</Label>
                    <Input
                      type="number"
                      value={loc.sort_order}
                      onChange={(e) => {
                        const updated = [...locations];
                        updated[idx] = { ...loc, sort_order: Number(e.target.value) };
                        setLocations(updated);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={loc.active}
                      onCheckedChange={(c) => {
                        const updated = [...locations];
                        updated[idx] = { ...loc, active: !!c };
                        setLocations(updated);
                      }}
                    />
                    <Label className="text-xs">{t('locations.active')}</Label>
                    <Button size="sm" variant="outline" onClick={() => saveLocation(loc)}>
                      OK
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options">
          <Card>
            <CardHeader>
              <CardTitle>{t('tabs.options')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.map((opt, idx) => (
                <div key={opt.key} className="flex items-center justify-between border-b pb-3">
                  <div className="space-y-1 flex-1 mr-4">
                    <Label>{opt.key}</Label>
                    <Input
                      value={opt.label}
                      onChange={(e) => {
                        const updated = [...options];
                        updated[idx] = { ...opt, label: e.target.value };
                        setOptions(updated);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={opt.enabled}
                      onCheckedChange={(c) => {
                        const updated = [...options];
                        updated[idx] = { ...opt, enabled: !!c };
                        setOptions(updated);
                      }}
                    />
                    <Label className="text-xs">{t('options.enabled')}</Label>
                    <Button size="sm" variant="outline" onClick={() => saveOption(opt)}>
                      OK
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
