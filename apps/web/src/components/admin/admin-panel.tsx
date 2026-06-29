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
import { SHOW_PRICING_OPTION_KEY } from '@globus/core/business';
import { createBrowserClient } from '@/lib/supabase/client';
import { Save, Trash2, Plus } from 'lucide-react';
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

/** Options dont le cocher ajoute un supplément au tarif de base */
const PRICED_OPTION_KEYS = new Set(['fragile', 'perishable', 'extra_insurance']);

function snapshotLocations(locations: PickupLocation[]) {
  return Object.fromEntries(locations.map((loc) => [loc.id, { ...loc }]));
}

function snapshotOptions(options: DeliveryOptionConfig[]) {
  return Object.fromEntries(options.map((opt) => [opt.key, { ...opt }]));
}

function snapshotModifiers(pricing: PricingRule | null): Record<string, number> {
  if (!pricing) return {};
  return { ...(pricing.modifiers as Record<string, number>) };
}

function isLocationDirty(
  loc: PickupLocation,
  baselines: Record<string, PickupLocation>,
) {
  const base = baselines[loc.id];
  if (!base) return true;
  return (
    base.label !== loc.label ||
    base.active !== loc.active ||
    base.sort_order !== loc.sort_order
  );
}

function isOptionDirty(
  opt: DeliveryOptionConfig,
  baselines: Record<string, DeliveryOptionConfig>,
) {
  const base = baselines[opt.key];
  if (!base) return true;
  return base.label !== opt.label || base.enabled !== opt.enabled;
}

function isOptionModifierDirty(
  key: string,
  pricing: PricingRule | null,
  modifierBaselines: Record<string, number>,
) {
  if (!PRICED_OPTION_KEYS.has(key) || !pricing) return false;
  const mods = pricing.modifiers as Record<string, number>;
  const current = mods[key] ?? 0;
  const base = modifierBaselines[key] ?? 0;
  return current !== base;
}

function isOptionRowDirty(
  opt: DeliveryOptionConfig,
  optionBaselines: Record<string, DeliveryOptionConfig>,
  pricing: PricingRule | null,
  modifierBaselines: Record<string, number>,
) {
  return (
    isOptionDirty(opt, optionBaselines) ||
    isOptionModifierDirty(opt.key, pricing, modifierBaselines)
  );
}

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
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [pricing, setPricing] = useState(pricingRules[0] ?? null);
  const [settings, setSettings] = useState(initialSettings);
  const [locations, setLocations] = useState(initialLocations);
  const [options, setOptions] = useState(initialOptions);
  const initialShowPricing =
    initialOptions.find((o) => o.key === SHOW_PRICING_OPTION_KEY)?.enabled ?? false;
  const [showPricingVisible, setShowPricingVisible] = useState(initialShowPricing);
  const [showPricingBaseline, setShowPricingBaseline] = useState(initialShowPricing);
  const collaboratorOptions = options.filter((o) => o.key !== SHOW_PRICING_OPTION_KEY);
  const [locationBaselines, setLocationBaselines] = useState(() =>
    snapshotLocations(initialLocations),
  );
  const [optionBaselines, setOptionBaselines] = useState(() =>
    snapshotOptions(initialOptions),
  );
  const [modifierBaselines, setModifierBaselines] = useState(() =>
    snapshotModifiers(pricingRules[0] ?? null),
  );

  function getModifierPrice(key: string): number {
    if (!pricing) return 0;
    return (pricing.modifiers as Record<string, number>)[key] ?? 0;
  }

  function setModifierPrice(key: string, value: number) {
    if (!pricing) return;
    setPricing({
      ...pricing,
      modifiers: {
        ...(pricing.modifiers as Record<string, number>),
        [key]: value,
      },
    });
  }

  function isPricingSectionDirty() {
    if (!pricing) return showPricingVisible !== showPricingBaseline;
    const base = pricingRules[0];
    if (!base) return true;
    return (
      base.label !== pricing.label ||
      base.base_price_chf !== pricing.base_price_chf ||
      base.active !== pricing.active ||
      showPricingVisible !== showPricingBaseline
    );
  }

  async function savePricing() {
    if (!pricing) return;
    setSaving(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from('pricing_rules')
        .update({
          label: pricing.label,
          base_price_chf: pricing.base_price_chf,
          modifiers: pricing.modifiers,
          active: pricing.active,
        })
        .eq('id', pricing.id);

      if (error) throw error;

      if (showPricingVisible !== showPricingBaseline) {
        const showPricingOpt = options.find((o) => o.key === SHOW_PRICING_OPTION_KEY);
        const res = await fetch('/api/admin/delivery-options', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: SHOW_PRICING_OPTION_KEY,
            label: showPricingOpt?.label ?? 'Afficher le tarif',
            enabled: showPricingVisible,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message ?? t('error'));
        }

        setShowPricingBaseline(showPricingVisible);
        setOptions((prev) =>
          prev.map((o) =>
            o.key === SHOW_PRICING_OPTION_KEY ? { ...o, enabled: showPricingVisible } : o,
          ),
        );
        setOptionBaselines((prev) => {
          const current = prev[SHOW_PRICING_OPTION_KEY];
          if (!current) return prev;
          return {
            ...prev,
            [SHOW_PRICING_OPTION_KEY]: { ...current, enabled: showPricingVisible },
          };
        });
      }

      setModifierBaselines(snapshotModifiers(pricing));
      setMessage(t('saved'));
      setMessageType('success');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('error'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'app_settings', value: settings });

    setSaving(false);
    setMessage(error ? t('error') : t('saved'));
    setMessageType(error ? 'error' : 'success');
    router.refresh();
  }

  async function saveLocation(id: string) {
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;

    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('pickup_locations')
      .update({ label: loc.label, active: loc.active, sort_order: loc.sort_order })
      .eq('id', id);

    setSaving(false);
    if (!error) {
      setLocationBaselines((prev) => ({ ...prev, [id]: { ...loc } }));
    }
    setMessage(error ? t('error') : t('saved'));
    setMessageType(error ? 'error' : 'success');
    router.refresh();
  }

  async function deleteLocation(id: string) {
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;

    const confirmed = window.confirm(
      t('locations.deleteConfirm', { label: loc.label }),
    );
    if (!confirmed) return;

    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.from('pickup_locations').delete().eq('id', id);

    if (error) {
      setMessage(t('locations.deleteBlocked'));
      setMessageType('error');
      setSaving(false);
      return;
    }

    setLocations(locations.filter((l) => l.id !== id));
    setLocationBaselines((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSaving(false);
    setMessage(t('locations.deleted'));
    setMessageType('success');
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
      setLocationBaselines((prev) => ({ ...prev, [data.id]: { ...data } }));
    }
    setSaving(false);
    setMessage(error ? t('error') : t('saved'));
    setMessageType(error ? 'error' : 'success');
    router.refresh();
  }

  async function saveOption(key: string) {
    const opt = options.find((o) => o.key === key);
    if (!opt) return;

    setSaving(true);

    try {
      const res = await fetch('/api/admin/delivery-options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: opt.key,
          label: opt.label,
          enabled: opt.enabled,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? t('error'));
      }

      // Enregistrer aussi les suppléments tarifaires si modifiés
      if (
        pricing &&
        PRICED_OPTION_KEYS.has(key) &&
        isOptionModifierDirty(key, pricing, modifierBaselines)
      ) {
        const supabase = createBrowserClient();
        const { error: pricingError } = await supabase
          .from('pricing_rules')
          .update({ modifiers: pricing.modifiers })
          .eq('id', pricing.id);

        if (pricingError) throw pricingError;
      }

      setOptionBaselines((prev) => ({ ...prev, [key]: { ...opt } }));
      if (pricing && PRICED_OPTION_KEYS.has(key)) {
        setModifierBaselines((prev) => ({
          ...prev,
          [key]: getModifierPrice(key),
        }));
      }
      setMessage(t('saved'));
      setMessageType('success');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('error'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          className={
            messageType === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'
          }
        >
          {message}
        </p>
      )}

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
            <CardContent className="space-y-6">
              {pricing && (
                <>
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('pricing.amountSection')}
                    </p>
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
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="pricing-rule-active"
                        checked={pricing.active}
                        onCheckedChange={(c) => setPricing({ ...pricing, active: !!c })}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="pricing-rule-active">{t('pricing.ruleActive')}</Label>
                        <p className="text-xs text-muted-foreground">{t('pricing.ruleActiveHint')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('pricing.visibilitySection')}
                    </p>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="pricing-visible-staff"
                        checked={showPricingVisible}
                        onCheckedChange={(c) => setShowPricingVisible(!!c)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="pricing-visible-staff">{t('pricing.visibleToStaff')}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t('pricing.visibleToStaffHint')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground border-t pt-4">
                    {t('pricing.surchargesHint')}
                  </p>

                  {isPricingSectionDirty() && (
                    <Button onClick={savePricing} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {t('actions.save')}
                    </Button>
                  )}
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
                  <span className="font-medium">{t(`hours.days.${day}`)}</span>
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
                <Save className="h-4 w-4 mr-2" />
                {t('actions.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>{t('tabs.locations')}</CardTitle>
              <Button size="sm" onClick={addLocation} disabled={saving}>
                <Plus className="h-4 w-4 mr-1" />
                {t('actions.add')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {locations.map((loc, idx) => (
                <div
                  key={loc.id}
                  className="grid gap-3 border-b pb-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
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
                    <div className="flex items-center gap-2 pt-6 sm:pt-0">
                      <Checkbox
                        id={`loc-active-${loc.id}`}
                        checked={loc.active}
                        onCheckedChange={(c) => {
                          const updated = [...locations];
                          updated[idx] = { ...loc, active: !!c };
                          setLocations(updated);
                        }}
                      />
                      <Label htmlFor={`loc-active-${loc.id}`} className="text-sm">
                        {t('locations.active')}
                      </Label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {isLocationDirty(loc, locationBaselines) && (
                      <Button
                        size="sm"
                        onClick={() => saveLocation(loc.id)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {t('actions.save')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                      onClick={() => deleteLocation(loc.id)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('actions.delete')}
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
              {collaboratorOptions.map((opt, idx) => (
                <div
                  key={opt.key}
                  className="grid gap-3 border-b pb-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>{opt.key}</Label>
                      <Input
                        value={opt.label}
                        onChange={(e) => {
                          const updated = [...options];
                          const optionIndex = options.findIndex((o) => o.key === opt.key);
                          updated[optionIndex] = { ...opt, label: e.target.value };
                          setOptions(updated);
                        }}
                      />
                    </div>
                    {PRICED_OPTION_KEYS.has(opt.key) && pricing && (
                      <div className="space-y-1">
                        <Label>{t('options.surcharge')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getModifierPrice(opt.key)}
                          onChange={(e) =>
                            setModifierPrice(opt.key, Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-6 sm:pt-0">
                      <Checkbox
                        id={`opt-enabled-${opt.key}`}
                        checked={opt.enabled}
                        onCheckedChange={(c) => {
                          const updated = [...options];
                          const optionIndex = options.findIndex((o) => o.key === opt.key);
                          updated[optionIndex] = { ...opt, enabled: !!c };
                          setOptions(updated);
                        }}
                      />
                      <Label htmlFor={`opt-enabled-${opt.key}`} className="text-sm">
                        {t('options.enabled')}
                      </Label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end sm:col-span-2">
                    {isOptionRowDirty(opt, optionBaselines, pricing, modifierBaselines) && (
                      <Button
                        size="sm"
                        onClick={() => saveOption(opt.key)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {t('actions.save')}
                      </Button>
                    )}
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
