'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  createOrderFormSchemaWithContext,
  type OrderFormData,
} from '@globus/core/schemas';
import { generateTimeSlots, isOutOfTariffZone, quoteDeliveryPrice } from '@globus/core/business';
import { PICKUP_OTHER_VALUE } from '@globus/core/types';
import type { AppSettings, PickupLocation, DeliveryOptionConfig } from '@globus/core/types';
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
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { PhoneInput } from '@/components/ui/phone-input';
import { PackageLines } from '@/components/orders/package-lines';
import { PriceHiddenHint } from '@/components/orders/price-hidden-hint';
import { translateValidationKey, formatDate } from '@/lib/utils';
import { VELOPOSTALE_PHONE, VELOPOSTALE_PHONE_TEL } from '@/lib/velopostale';
import { scrollToFirstFormError } from '@/lib/scroll-to-first-form-error';
import {
  ORDER_DRAFT_KEY,
  ORDER_DUPLICATE_SOURCE_KEY,
} from '@/lib/order-draft';
import type { FieldErrors } from 'react-hook-form';

const EMPTY_PACKAGE = {
  bag_number: '',
  description: '',
  weight: undefined,
  dimensions: '',
  fragile: false,
  perishable: false,
  value_over_1000: false,
  declared_value_chf: undefined,
  extra_insurance: false,
  goods_photo_url: '',
};

/** Renvoie le suffixe d'étage : 1 → "er", sinon → "ème" */
function floorSuffix(value: number): string {
  return value === 1 ? 'er' : 'ème';
}

/** Met un chiffre d'étage au bon format français : 1 → "1er", 2 → "2ème"... */
function formatFloor(value: number): string {
  return `${value}${floorSuffix(value)}`;
}

/**
 * Champ « Étage » : l'utilisateur saisit uniquement un chiffre, et le suffixe
 * (« er » / « ème ») est ajouté automatiquement. On stocke la valeur déjà
 * formatée (ex: "2ème") dans le champ `floor`.
 */
function FloorField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  // On récupère uniquement la partie chiffrée de la valeur enregistrée
  const match = (value ?? '').match(/\d+/);
  const numberPart = match ? match[0] : '';
  // Suffixe affiché à côté de la case (uniquement "er" ou "ème")
  const suffix = numberPart ? floorSuffix(Number.parseInt(numberPart, 10)) : '';

  function update(raw: string) {
    if (raw === '') {
      onChange('');
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      onChange('');
      return;
    }
    onChange(formatFloor(parsed));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          value={numberPart}
          onChange={(e) => update(e.target.value)}
          className="w-24"
        />
        {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

const formSectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
  }),
};

interface OrderFormProps {
  locale: string;
  pickupLocations: PickupLocation[];
  settings: AppSettings;
  deliveryOptions: DeliveryOptionConfig[];
  showPricing: boolean;
}

export function OrderForm({
  locale,
  pickupLocations,
  settings,
  deliveryOptions,
  showPricing,
}: OrderFormProps) {
  const t = useTranslations();
  const router = useRouter();
  // Index du colis dont la photo est en cours d'envoi (null = aucun)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [timeSlots, setTimeSlots] = useState<{ value: string; label: string }[]>([]);

  const schema = createOrderFormSchemaWithContext({
    operatingHours: settings.operating_hours,
    cutoffs: settings.cutoffs,
    now: new Date(),
  });

  // Valeurs de départ (formulaire vide) — réutilisées pour « Réinitialiser »
  // weight/declared_value restent vides au départ (undefined) ; le type Zod
  // les exige seulement à la validation, d'où le cast.
  const emptyFormValues = {
    pickup_location_id: '',
    pickup_address_custom: '',
    delivery_address: '',
    access_type: '' as OrderFormData['access_type'],
    access_detail: '',
    is_hotel: false,
    is_villa_or_arcade: false,
    hotel_name: '',
    hotel_room_number: '',
    floor: '',
    client_name: '',
    client_phone: '',
    requested_date: '',
    requested_time_slot: '',
    time_slot_notes: '',
    leave_at_door: false,
    special_instructions: '',
    packages: [] as unknown as OrderFormData['packages'],
    price_chf: undefined,
  };

  const form = useForm<OrderFormData>({
    resolver: zodResolver(schema),
    defaultValues: emptyFormValues,
    mode: 'onChange',
    // On gère nous-mêmes le focus via scrollToFirstFormError :
    // sinon RHF focus le 1er champ "register" (ex. nom) et ignore les Select.
    shouldFocusError: false,
  });

  // Gestion de la liste dynamique de colis
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'packages',
  });

  const watchPickup = form.watch('pickup_location_id');
  const watchAccessType = form.watch('access_type');
  const watchIsHotel = form.watch('is_hotel');
  const watchDate = form.watch('requested_date');
  const watchPackages = form.watch('packages');
  const watchTimeSlot = form.watch('requested_time_slot');
  // Incrémente après restauration du brouillon pour remonter les listes déroulantes
  // (sinon elles restent vides alors que le texte libre est bien rempli).
  const [selectKey, setSelectKey] = useState(0);
  // Date de la commande dupliquée (bandeau informatif)
  const [duplicateSourceDate, setDuplicateSourceDate] = useState<string | null>(null);

  const isOptionEnabled = (key: string) =>
    deliveryOptions.some((o) => o.key === key && o.enabled);

  // Restaurer le brouillon (retour récap ou duplication depuis l'historique)
  useEffect(() => {
    const draft = sessionStorage.getItem(ORDER_DRAFT_KEY);
    if (!draft) return;

    const duplicateSource = sessionStorage.getItem(ORDER_DUPLICATE_SOURCE_KEY);
    if (duplicateSource) {
      setDuplicateSourceDate(duplicateSource);
    }

    try {
      const parsed = JSON.parse(draft) as OrderFormData;

      // Reconstruire chaque colis pour ne rien perdre (cases cochées, montants…)
      const packages = (parsed.packages?.length ? parsed.packages : [{ ...EMPTY_PACKAGE }]).map(
        (pkg) => ({
          ...EMPTY_PACKAGE,
          ...pkg,
          value_over_1000:
            pkg.value_over_1000 === true ||
            (pkg.declared_value_chf != null && String(pkg.declared_value_chf) !== ''),
        }),
      );

      // Préparer les créneaux avant le reset, pour que le Select trouve sa valeur
      let requested_time_slot = parsed.requested_time_slot ?? '';
      if (parsed.requested_date) {
        const date = new Date(parsed.requested_date + 'T12:00:00');
        const slots = generateTimeSlots(date, settings.operating_hours, new Date());
        setTimeSlots(slots);
        if (requested_time_slot && !slots.some((s) => s.value === requested_time_slot)) {
          requested_time_slot = '';
        }
      }

      form.reset({
        pickup_location_id: parsed.pickup_location_id ?? '',
        pickup_address_custom: parsed.pickup_address_custom ?? '',
        delivery_address: parsed.delivery_address ?? '',
        access_type: parsed.access_type ?? '',
        access_detail: parsed.access_detail ?? '',
        is_hotel: !!parsed.is_hotel,
        is_villa_or_arcade: !!parsed.is_villa_or_arcade,
        hotel_name: parsed.hotel_name ?? '',
        hotel_room_number: parsed.hotel_room_number ?? '',
        floor: parsed.floor ?? '',
        client_name: parsed.client_name ?? '',
        client_phone: parsed.client_phone ?? '',
        requested_date: parsed.requested_date ?? '',
        requested_time_slot,
        time_slot_notes: parsed.time_slot_notes ?? '',
        leave_at_door: !!parsed.leave_at_door,
        special_instructions: parsed.special_instructions ?? '',
        packages,
        price_chf: parsed.price_chf,
      });
      setSelectKey((k) => k + 1);
    } catch {
      // Brouillon invalide : on ignore
    }
  }, [form, settings.operating_hours]);

  // Mettre à jour les créneaux quand la date change (et régulièrement
  // si c'est aujourd'hui, pour retirer les créneaux déjà commencés)
  useEffect(() => {
    function refreshSlots() {
      if (!watchDate) {
        setTimeSlots([]);
        return;
      }
      const date = new Date(watchDate + 'T12:00:00');
      const slots = generateTimeSlots(date, settings.operating_hours, new Date());
      setTimeSlots(slots);
      const current = form.getValues('requested_time_slot');
      if (current && !slots.find((s) => s.value === current)) {
        form.setValue('requested_time_slot', '');
      }
    }

    refreshSlots();
    // Toutes les 30 s si une date est choisie (utile surtout pour « aujourd'hui »)
    const id = window.setInterval(refreshSlots, 30_000);
    return () => window.clearInterval(id);
  }, [watchDate, settings.operating_hours, form]);

  // Prix standard de la grille : code postal + poids le plus élevé (réel ou IATA).
  const watchAddress = form.watch('delivery_address');
  const quotedPrice = quoteDeliveryPrice(watchAddress, watchPackages ?? []);
  const priceOutOfZone = isOutOfTariffZone(watchAddress);
  useEffect(() => {
    form.setValue('price_chf', quotedPrice ?? (undefined as unknown as number));
  }, [quotedPrice, form]);

  async function handlePhotoUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadingIndex(null);
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${user.id}/${Date.now()}-${safeName}`;

    const { data, error } = await supabase.storage
      .from('goods-photos')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      setUploadingIndex(null);
      return;
    }

    // On enregistre le chemin interne (pas une URL publique)
    form.setValue(`packages.${index}.goods_photo_url`, data.path);
    setUploadingIndex(null);
  }

  function onSubmit(data: OrderFormData) {
    sessionStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(data));
    router.push(`/${locale}/orders/new/review`);
  }

  /** Vide tout le formulaire + le brouillon sauvegardé (retour depuis le récap) */
  function handleResetForm() {
    sessionStorage.removeItem(ORDER_DRAFT_KEY);
    sessionStorage.removeItem(ORDER_DUPLICATE_SOURCE_KEY);
    setDuplicateSourceDate(null);
    setTimeSlots([]);
    form.reset({
      ...emptyFormValues,
      packages: [],
      price_chf: undefined,
    });
    setSelectKey((k) => k + 1);
  }

  /** Si le formulaire est invalide, on scroll vers le premier champ en rouge. */
  function onInvalid(errors: FieldErrors<OrderFormData>) {
    scrollToFirstFormError(errors);
  }

  // Erreur d'un champ simple de la commande
  function getError(field: keyof OrderFormData) {
    const err = form.formState.errors[field];
    if (!err || typeof err !== 'object' || !('message' in err) || !err.message) return undefined;
    return translateValidationKey(err.message as string, t);
  }

  // Erreur d'un champ d'un colis précis
  function getPackageError(index: number, field: keyof OrderFormData['packages'][number]) {
    const msg = form.formState.errors.packages?.[index]?.[field]?.message;
    if (!msg) return undefined;
    return translateValidationKey(msg as string, t);
  }

  // Erreur globale sur la liste de colis (ex: aucun colis)
  const packagesRootError =
    form.formState.errors.packages?.root?.message ??
    (typeof form.formState.errors.packages?.message === 'string'
      ? form.formState.errors.packages?.message
      : undefined);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      className="space-y-6"
    >
      {duplicateSourceDate && (
        <div
          role="status"
          className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
        >
          {t('order.duplicateBanner', { date: formatDate(duplicateSourceDate) })}
        </div>
      )}

      {/* Section obligatoire — Départ & destination */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={formSectionVariants}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.pickup')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2" data-form-field="pickup_location_id">
            <Label>{t('order.fields.pickupLocation')} *</Label>
            <Select
              key={`pickup-${selectKey}`}
              value={watchPickup || undefined}
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
            <div className="space-y-2" data-form-field="pickup_address_custom">
              <Label htmlFor="pickup_address_custom">{t('order.fields.pickupCustom')} *</Label>
              <Controller
                name="pickup_address_custom"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="pickup_address_custom"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={t('order.fields.pickupCustomPlaceholder')}
                  />
                )}
              />
              {getError('pickup_address_custom') && (
                <p className="text-sm text-destructive">{getError('pickup_address_custom')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      <motion.div custom={1} initial="hidden" animate="visible" variants={formSectionVariants}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.delivery')} *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2" data-form-field="client_name">
              <Label>{t('order.fields.clientName')} *</Label>
              <Input {...form.register('client_name')} />
              {getError('client_name') && (
                <p className="text-sm text-destructive">{getError('client_name')}</p>
              )}
            </div>
            <div className="space-y-2" data-form-field="client_phone">
              <Controller
                name="client_phone"
                control={form.control}
                render={({ field }) => (
                  <PhoneInput
                    label={`${t('order.fields.clientPhone')} *`}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={getError('client_phone')}
                  />
                )}
              />
            </div>
          </div>

          <div data-form-field="delivery_address">
          <Controller
            name="delivery_address"
            control={form.control}
            render={({ field }) => (
              <AddressAutocomplete
                label={t('order.fields.deliveryAddress')}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Rue, numéro, NPA, ville..."
                hint={t('order.address.hint')}
                error={getError('delivery_address')}
                required
              />
            )}
          />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_villa_or_arcade"
                checked={form.watch('is_villa_or_arcade')}
                onCheckedChange={(c) => form.setValue('is_villa_or_arcade', !!c)}
              />
              <Label htmlFor="is_villa_or_arcade">{t('order.fields.isVillaOrArcade')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_hotel"
                checked={watchIsHotel}
                onCheckedChange={(c) => {
                  const checked = !!c;
                  form.setValue('is_hotel', checked, { shouldValidate: true });
                  if (!checked) {
                    form.setValue('hotel_name', '');
                    form.setValue('hotel_room_number', '');
                  }
                }}
              />
              <Label htmlFor="is_hotel">{t('order.fields.isHotel')}</Label>
            </div>
          </div>

          {watchIsHotel && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2" data-form-field="hotel_name">
                <Label>{t('order.fields.hotelName')} *</Label>
                <Input {...form.register('hotel_name')} placeholder="Ex : Hôtel des Alpes" />
                {getError('hotel_name') && (
                  <p className="text-sm text-destructive">{getError('hotel_name')}</p>
                )}
              </div>
              <div className="space-y-2" data-form-field="hotel_room_number">
                <Label>{t('order.fields.hotelRoom')} *</Label>
                <Input {...form.register('hotel_room_number')} placeholder="Ex : 412" />
                {getError('hotel_room_number') && (
                  <p className="text-sm text-destructive">{getError('hotel_room_number')}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 max-w-xs" data-form-field="floor">
            <Controller
              name="floor"
              control={form.control}
              render={({ field }) => (
                <FloorField
                  label={`${t('order.fields.floor')}${watchIsHotel ? '' : ' *'}`}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            {getError('floor') && (
              <p className="text-sm text-destructive">{getError('floor')}</p>
            )}
          </div>

          <div className="space-y-2" data-form-field="access_type">
            <Label>{t('order.fields.accessType')} *</Label>
            <Select
              key={`access-${selectKey}`}
              value={watchAccessType || undefined}
              onValueChange={(v) =>
                form.setValue('access_type', v as OrderFormData['access_type'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('order.fields.accessType')} />
              </SelectTrigger>
              <SelectContent>
                {(['code', 'interphone', 'acces_libre', 'autre'] as const).map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`order.accessTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getError('access_type') && (
              <p className="text-sm text-destructive">{getError('access_type')}</p>
            )}
          </div>

          {watchAccessType && watchAccessType !== 'acces_libre' && (
            <div className="space-y-2" data-form-field="access_detail">
              <Label>{t('order.fields.accessDetail')} *</Label>
              <Input {...form.register('access_detail')} />
              {getError('access_detail') && (
                <p className="text-sm text-destructive">{getError('access_detail')}</p>
              )}
            </div>
          )}

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

          <div className="space-y-2">
            <Label>{t('order.fields.specialInstructions')}</Label>
            <Textarea {...form.register('special_instructions')} rows={2} />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Date & créneau */}
      <motion.div custom={2} initial="hidden" animate="visible" variants={formSectionVariants}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.scheduling')} *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2" data-form-field="requested_date">
              <Label>{t('order.fields.requestedDate')} *</Label>
              <Input type="date" {...form.register('requested_date')} min={new Date().toISOString().split('T')[0]} />
              {form.formState.errors.requested_date?.message && (
                <p className="text-sm text-destructive">
                  {translateValidationKey(
                    form.formState.errors.requested_date.message as string,
                    t,
                  )}
                  {/* Heure limite dépassée : on propose d'appeler La Vélopostale */}
                  {form.formState.errors.requested_date.message ===
                    'order.validation.cutoffExceeded' && (
                    <>
                      {' '}
                      <a
                        href={`tel:${VELOPOSTALE_PHONE_TEL}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        {VELOPOSTALE_PHONE}
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2" data-form-field="requested_time_slot">
              <Label>{t('order.fields.requestedTimeSlot')} *</Label>
              <Select
                key={`slot-${selectKey}-${timeSlots.length}`}
                value={watchTimeSlot || undefined}
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
          </div>
          <div className="space-y-2">
            <Label>{t('order.fields.timeSlotNotes')}</Label>
            <Textarea
              {...form.register('time_slot_notes')}
              rows={2}
              placeholder={t('order.fields.timeSlotNotesPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Section obligatoire — Caractéristiques du/des colis (multi-colis) */}
      <motion.div custom={3} initial="hidden" animate="visible" variants={formSectionVariants}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.characteristics')} *</CardTitle>
        </CardHeader>
        <CardContent>
          <PackageLines
            form={form}
            fields={fields}
            append={append}
            remove={remove}
            uploadingIndex={uploadingIndex}
            onPhoto={handlePhotoUpload}
            isOptionEnabled={isOptionEnabled}
            getPackageError={getPackageError}
            packagesRootError={packagesRootError}
          />
        </CardContent>
      </Card>
      </motion.div>

      {/* Tarif (visible uniquement si activé dans l'administration) */}
      {showPricing && (
      <motion.div custom={4} initial="hidden" animate="visible" variants={formSectionVariants}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{t('order.sections.pricing')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label>{t('order.fields.price')}</Label>
            {priceOutOfZone ? (
              <PriceHiddenHint label={t('order.pricing.hiddenOutOfZone')} />
            ) : (
              <Input
                {...form.register('price_chf')}
                type="number"
                step="0.01"
                readOnly
                tabIndex={-1}
                aria-readonly="true"
                className="bg-muted cursor-not-allowed"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {priceOutOfZone
                ? t('order.pricing.hiddenOutOfZoneHint')
                : quotedPrice == null
                  ? t('order.pricing.unavailable')
                  : t('order.pricing.autoCalculated')}
            </p>
          </div>
        </CardContent>
      </Card>
      </motion.div>
      )}

      <motion.div custom={showPricing ? 5 : 4} initial="hidden" animate="visible" variants={formSectionVariants}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" className="w-full sm:w-auto transition-transform active:scale-[0.98]">
          {t('order.actions.continue')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleResetForm}
          className="w-full sm:w-auto"
        >
          {t('order.actions.resetForm')}
        </Button>
      </div>
      </motion.div>
    </form>
  );
}
