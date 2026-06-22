'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  orderFormSchema,
  createOrderFormSchemaWithContext,
  type OrderFormData,
} from '@globus/core/schemas';
import {
  generateTimeSlots,
  shouldOfferExtraInsurance,
  calculatePrice,
} from '@globus/core/business';
import { PICKUP_OTHER_VALUE } from '@globus/core/types';
import type { AppSettings, PickupLocation, PricingRule, DeliveryOptionConfig } from '@globus/core/types';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Upload } from 'lucide-react';
import { cn, translateValidationKey } from '@/lib/utils';

const ORDER_DRAFT_KEY = 'globus_order_draft';

interface OrderFormProps {
  locale: string;
  pickupLocations: PickupLocation[];
  settings: AppSettings;
  pricingRule: PricingRule | null;
  deliveryOptions: DeliveryOptionConfig[];
}

export function OrderForm({
  locale,
  pickupLocations,
  settings,
  pricingRule,
  deliveryOptions,
}: OrderFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<{ value: string; label: string }[]>([]);

  const schema = createOrderFormSchemaWithContext({
    operatingHours: settings.operating_hours,
    cutoffs: settings.cutoffs,
    now: new Date(),
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pickup_location_id: '',
      pickup_address_custom: '',
      delivery_address: '',
      access_type: 'acces_libre',
      access_detail: '',
      is_hotel: false,
      hotel_room_number: '',
      floor: '',
      client_name: '',
      client_phone: '',
      requested_date: '',
      requested_time_slot: '',
      weight: undefined,
      dimensions: '',
      leave_at_door: false,
      fragile: false,
      perishable: false,
      goods_photo_url: '',
      declared_value_chf: undefined,
      extra_insurance: false,
      special_instructions: '',
      price_chf: pricingRule?.base_price_chf ?? 25,
    },
    mode: 'onChange',
  });

  const watchPickup = form.watch('pickup_location_id');
  const watchAccessType = form.watch('access_type');
  const watchIsHotel = form.watch('is_hotel');
  const watchDate = form.watch('requested_date');
  const watchDeclaredValue = form.watch('declared_value_chf');
  const watchFragile = form.watch('fragile');
  const watchPerishable = form.watch('perishable');
  const watchExtraInsurance = form.watch('extra_insurance');
  const showInsuranceOffer = shouldOfferExtraInsurance(
    typeof watchDeclaredValue === 'number' ? watchDeclaredValue : null,
  );

  const isOptionEnabled = (key: string) =>
    deliveryOptions.some((o) => o.key === key && o.enabled);

  // Restaurer le brouillon si existant
  useEffect(() => {
    const draft = sessionStorage.getItem(ORDER_DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        Object.entries(parsed).forEach(([key, value]) => {
          form.setValue(key as keyof OrderFormData, value as never);
        });
      } catch {
        // Ignorer
      }
    }
  }, [form]);

  // Mettre à jour les créneaux quand la date change
  useEffect(() => {
    if (watchDate) {
      const date = new Date(watchDate + 'T12:00:00');
      const slots = generateTimeSlots(date, settings.operating_hours);
      setTimeSlots(slots);
      if (form.getValues('requested_time_slot') && !slots.find((s) => s.value === form.getValues('requested_time_slot'))) {
        form.setValue('requested_time_slot', '');
      }
    } else {
      setTimeSlots([]);
    }
  }, [watchDate, settings.operating_hours, form]);

  // Recalculer le prix
  useEffect(() => {
    if (pricingRule) {
      const result = calculatePrice(
        {
          fragile: watchFragile,
          perishable: watchPerishable,
          extra_insurance: watchExtraInsurance,
          declared_value_chf:
            typeof watchDeclaredValue === 'number' ? watchDeclaredValue : null,
        },
        pricingRule,
      );
      form.setValue('price_chf', result.total);
    }
  }, [watchFragile, watchPerishable, watchExtraInsurance, watchDeclaredValue, pricingRule, form]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createBrowserClient();
    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from('goods-photos')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('goods-photos').getPublicUrl(data.path);
    form.setValue('goods_photo_url', urlData.publicUrl);
    setUploading(false);
  }

  function onSubmit(data: OrderFormData) {
    sessionStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(data));
    router.push(`/${locale}/orders/new/review`);
  }

  function getError(field: keyof OrderFormData) {
    const err = form.formState.errors[field];
    if (!err?.message) return undefined;
    return translateValidationKey(err.message as string, t);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Section obligatoire — Départ & destination */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.pickup')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('order.fields.pickupLocation')} *</Label>
            <Select
              value={watchPickup}
              onValueChange={(v) => form.setValue('pickup_location_id', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('order.fields.pickupLocation')} />
              </SelectTrigger>
              <SelectContent>
                {pickupLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.label}
                  </SelectItem>
                ))}
                <SelectItem value={PICKUP_OTHER_VALUE}>{t('order.fields.pickupOther')}</SelectItem>
              </SelectContent>
            </Select>
            {getError('pickup_location_id') && (
              <p className="text-sm text-destructive">{getError('pickup_location_id')}</p>
            )}
          </div>

          {watchPickup === PICKUP_OTHER_VALUE && (
            <div className="space-y-2">
              <Label>{t('order.fields.pickupCustom')} *</Label>
              <Input {...form.register('pickup_address_custom')} />
              {getError('pickup_address_custom') && (
                <p className="text-sm text-destructive">{getError('pickup_address_custom')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.delivery')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('order.fields.deliveryAddress')} *</Label>
            <Textarea {...form.register('delivery_address')} rows={2} />
            {getError('delivery_address') && (
              <p className="text-sm text-destructive">{getError('delivery_address')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('order.fields.accessType')} *</Label>
            <Select
              value={watchAccessType}
              onValueChange={(v) =>
                form.setValue('access_type', v as OrderFormData['access_type'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['code', 'interphone', 'acces_libre', 'autre'] as const).map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`order.accessTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {watchAccessType !== 'acces_libre' && (
            <div className="space-y-2">
              <Label>{t('order.fields.accessDetail')} *</Label>
              <Input {...form.register('access_detail')} />
              {getError('access_detail') && (
                <p className="text-sm text-destructive">{getError('access_detail')}</p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_hotel"
              checked={watchIsHotel}
              onCheckedChange={(c) => form.setValue('is_hotel', !!c, { shouldValidate: true })}
            />
            <Label htmlFor="is_hotel">{t('order.fields.isHotel')}</Label>
          </div>

          {watchIsHotel && (
            <div className="space-y-2">
              <Label>{t('order.fields.hotelRoom')} *</Label>
              <Input {...form.register('hotel_room_number')} />
              {getError('hotel_room_number') && (
                <p className="text-sm text-destructive">{getError('hotel_room_number')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date & créneau */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.scheduling')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('order.fields.requestedDate')}</Label>
            <Input type="date" {...form.register('requested_date')} min={new Date().toISOString().split('T')[0]} />
            {getError('requested_date') && (
              <p className="text-sm text-destructive">{getError('requested_date')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('order.fields.requestedTimeSlot')}</Label>
            <Select
              value={form.watch('requested_time_slot') || ''}
              onValueChange={(v) => form.setValue('requested_time_slot', v, { shouldValidate: true })}
              disabled={!watchDate || timeSlots.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={timeSlots.length === 0 ? '—' : undefined} />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getError('requested_time_slot') && (
              <p className="text-sm text-destructive">{getError('requested_time_slot')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Options repliables */}
      <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
              <CardTitle className="text-lg">{t('order.sections.characteristics')}</CardTitle>
              <ChevronDown
                className={cn('h-5 w-5 transition-transform', optionsOpen && 'rotate-180')}
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('order.fields.clientName')}</Label>
                  <Input {...form.register('client_name')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('order.fields.clientPhone')}</Label>
                  <Input {...form.register('client_phone')} type="tel" />
                </div>
                <div className="space-y-2">
                  <Label>{t('order.fields.floor')}</Label>
                  <Input {...form.register('floor')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('order.fields.weight')}</Label>
                  <Input {...form.register('weight')} type="number" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label>{t('order.fields.dimensions')}</Label>
                  <Input {...form.register('dimensions')} placeholder="30×20×15 cm" />
                </div>
                <div className="space-y-2">
                  <Label>{t('order.fields.declaredValue')}</Label>
                  <Input {...form.register('declared_value_chf')} type="number" step="0.01" />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {isOptionEnabled('leave_at_door') && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="leave_at_door"
                      checked={form.watch('leave_at_door')}
                      onCheckedChange={(c) => form.setValue('leave_at_door', !!c)}
                    />
                    <Label htmlFor="leave_at_door">{t('order.fields.leaveAtDoor')}</Label>
                  </div>
                )}
                {isOptionEnabled('fragile') && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fragile"
                      checked={watchFragile}
                      onCheckedChange={(c) => form.setValue('fragile', !!c)}
                    />
                    <Label htmlFor="fragile">{t('order.fields.fragile')}</Label>
                  </div>
                )}
                {isOptionEnabled('perishable') && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perishable"
                      checked={watchPerishable}
                      onCheckedChange={(c) => form.setValue('perishable', !!c)}
                    />
                    <Label htmlFor="perishable">{t('order.fields.perishable')}</Label>
                  </div>
                )}
                {showInsuranceOffer && isOptionEnabled('extra_insurance') && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="extra_insurance"
                      checked={watchExtraInsurance}
                      onCheckedChange={(c) =>
                        form.setValue('extra_insurance', !!c, { shouldValidate: true })
                      }
                    />
                    <Label htmlFor="extra_insurance">{t('order.fields.extraInsurance')}</Label>
                  </div>
                )}
              </div>
              {getError('extra_insurance') && (
                <p className="text-sm text-destructive">{getError('extra_insurance')}</p>
              )}

              <div className="space-y-2">
                <Label>{t('order.fields.goodsPhoto')}</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? t('common.loading') : t('order.actions.uploadPhoto')}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </Button>
                  {form.watch('goods_photo_url') && (
                    <span className="text-sm text-green-600">✓ Photo ajoutée</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('order.fields.specialInstructions')}</Label>
                <Textarea {...form.register('special_instructions')} rows={2} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tarif */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.pricing')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label>{t('order.fields.price')}</Label>
            <Input {...form.register('price_chf')} type="number" step="0.01" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        {t('order.actions.continue')}
      </Button>
    </form>
  );
}
