'use client';

import { useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  PACKAGE_FORMATS,
  billedWeightKg,
  findPackageFormat,
  formatDimensionsCm,
  iataWeightKg,
  shouldOfferExtraInsurance,
  totalBilledWeightKg,
  type PackageFormat,
} from '@globus/core/business';
import type { OrderFormData } from '@globus/core/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Box,
  ChevronDown,
  Gift,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Snowflake,
  Upload,
  Wine,
} from 'lucide-react';
import { translateValidationKey } from '@/lib/utils';

type PackageDraft = OrderFormData['packages'][number];

interface PackageLinesProps {
  form: UseFormReturn<OrderFormData>;
  fields: { id: string }[];
  append: (value: PackageDraft) => void;
  remove: (index: number | number[]) => void;
  uploadingIndex: number | null;
  onPhoto: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void;
  isOptionEnabled: (key: string) => boolean;
  getPackageError: (index: number, field: keyof PackageDraft) => string | undefined;
  packagesRootError?: string;
}

/** Un même format peut avoir plusieurs numéros de sac : on les groupe. */
interface PackageGroup {
  lineId: string;
  indexes: number[];
}

function newLineId(): string {
  return crypto.randomUUID();
}

/** Valeurs de départ d'un colis à partir d'un format. */
function createPackage(format: PackageFormat, lineId: string): PackageDraft {
  return {
    package_type: format.id,
    line_id: lineId,
    bag_number: '',
    description: '',
    weight: (format.estimatedActualKg ?? undefined) as unknown as number,
    dimensions: formatDimensionsCm(format.lengthCm, format.widthCm, format.heightCm),
    fragile: false,
    perishable: format.perishable,
    value_over_1000: false,
    declared_value_chf: undefined as unknown as number,
    extra_insurance: false,
    goods_photo_url: '',
  };
}

function formatIcon(id: string) {
  if (id.startsWith('cadeau')) return Gift;
  if (id.startsWith('delicatessa')) return ShoppingBag;
  if (id.startsWith('bouteille') || id === 'carton-6-vins') return Wine;
  if (id.startsWith('isotherme')) return Snowflake;
  return Box;
}

function formatKg(value: number): string {
  return value.toLocaleString('fr-CH', { maximumFractionDigits: 3 });
}

/**
 * Liste des colis, sur le modèle de Polypheme :
 * une ligne par format, une quantité +/−, le poids réel modifiable,
 * la taille modifiable, et à droite le poids qui compte (le plus élevé
 * entre le poids réel et le poids IATA).
 */
export function PackageLines({
  form,
  fields,
  append,
  remove,
  uploadingIndex,
  onPhoto,
  isOptionEnabled,
  getPackageError,
  packagesRootError,
}: PackageLinesProps) {
  const t = useTranslations();
  const packages = form.watch('packages') ?? [];
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [openLineId, setOpenLineId] = useState<string | null>(null);

  const groups: PackageGroup[] = useMemo(() => {
    const list: PackageGroup[] = [];
    packages.forEach((pkg, index) => {
      const lineId = pkg.line_id || fields[index]?.id || String(index);
      const existing = list.find((group) => group.lineId === lineId);
      if (existing) existing.indexes.push(index);
      else list.push({ lineId, indexes: [index] });
    });
    return list;
  }, [packages, fields]);

  const countByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const group of groups) {
      const type = packages[group.indexes[0]!]?.package_type;
      if (!type || type === 'autre') continue;
      counts.set(type, (counts.get(type) ?? 0) + group.indexes.length);
    }
    return counts;
  }, [groups, packages]);

  const filteredFormats = PACKAGE_FORMATS.filter((format) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return format.label.toLowerCase().includes(needle);
  });

  function addFormat(format: PackageFormat) {
    if (format.id !== 'autre') {
      const group = groups.find(
        (item) => packages[item.indexes[0]!]?.package_type === format.id,
      );
      if (group) {
        increase(group);
        setOpenLineId(group.lineId);
        setQuery('');
        return;
      }
    }

    const lineId = newLineId();
    append(createPackage(format, lineId));
    setOpenLineId(lineId);
    setQuery('');
    setPanelOpen(false);
  }

  function increase(group: PackageGroup) {
    const source = packages[group.indexes[0]!];
    if (!source) return;
    append({
      ...source,
      bag_number: '',
    });
    setOpenLineId(group.lineId);
  }

  function decrease(group: PackageGroup) {
    remove(group.indexes[group.indexes.length - 1]!);
  }

  /** Recopie un champ (poids, taille, case à cocher) sur tous les sacs du même format. */
  function updateGroup(group: PackageGroup, patch: Partial<PackageDraft>) {
    for (const index of group.indexes) {
      (Object.keys(patch) as (keyof PackageDraft)[]).forEach((key) => {
        form.setValue(`packages.${index}.${key}`, patch[key] as never, {
          shouldValidate: true,
          shouldDirty: true,
        });
      });
    }
  }

  const totalKg = totalBilledWeightKg(packages);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-sm font-semibold tracking-wide">COLIS</p>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setPanelOpen(true)}
            placeholder={t('order.packages.addExisting')}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setPanelOpen((open) => !open)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('order.packages.add')}
        </Button>
      </div>

      {panelOpen && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('order.packages.formatHint')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {filteredFormats.map((format) => {
              const Icon = formatIcon(format.id);
              const count = countByType.get(format.id) ?? 0;
              const size =
                format.lengthCm == null
                  ? t('order.packages.manualSize')
                  : `${format.lengthCm} × ${format.widthCm} × ${format.heightCm} cm`;
              return (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => addFormat(format)}
                  className="relative rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-foreground/40"
                >
                  {count > 0 && (
                    <Badge className="absolute right-2 top-2" variant="secondary">
                      ×{count}
                    </Badge>
                  )}
                  <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{format.label}</p>
                  <p className="text-xs text-muted-foreground">{size}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {groups.map((group) => {
        const first = packages[group.indexes[0]!];
        if (!first) return null;
        const format = findPackageFormat(first.package_type);
        const label = format?.label ?? t('order.fields.packageTitle', { number: group.indexes[0]! + 1 });
        const actual = typeof first.weight === 'number' ? first.weight : undefined;
        const iata = iataWeightKg(first.dimensions);
        const billed = billedWeightKg(actual, first.dimensions);
        const open = openLineId === group.lineId;

        return (
          <div key={group.lineId} className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-2 p-2">
              <button
                type="button"
                className="min-w-28 flex-1 text-left text-sm font-medium sm:flex-none sm:w-36"
                onClick={() => setOpenLineId(open ? null : group.lineId)}
              >
                {label}
              </button>

              <div className="flex items-center rounded-md border border-border">
                <button
                  type="button"
                  className="px-2 py-1 text-muted-foreground hover:text-foreground"
                  onClick={() => decrease(group)}
                  aria-label={t('order.packages.decrease')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm">{group.indexes.length}</span>
                <button
                  type="button"
                  className="px-2 py-1 text-muted-foreground hover:text-foreground"
                  onClick={() => increase(group)}
                  aria-label={t('order.packages.increase')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-20"
                  value={actual ?? ''}
                  onChange={(event) => {
                    const next = event.target.value === '' ? undefined : Number(event.target.value);
                    updateGroup(group, { weight: next as unknown as number });
                  }}
                  aria-label={t('order.packages.actualWeight')}
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>

              <DimensionInputs
                value={first.dimensions ?? ''}
                onChange={(dimensions) => updateGroup(group, { dimensions })}
              />

              <div className="ml-auto text-right">
                <p className="text-sm font-semibold">{formatKg(billed)} kg</p>
                <p className="text-xs text-muted-foreground">
                  {t('order.packages.iataWeight')} {formatKg(iata)} kg
                </p>
              </div>

              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setOpenLineId(open ? null : group.lineId)}
                aria-label={t('order.packages.details')}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {open && (
              <div className="space-y-4 border-t border-border p-3">
                {group.indexes.map((index, position) => (
                  <div key={fields[index]?.id ?? index} className="space-y-1">
                    <Label>
                      {t('order.fields.bagNumber')}
                      {group.indexes.length > 1 ? ` ${position + 1}` : ''} *
                    </Label>
                    <Input
                      value={packages[index]?.bag_number ?? ''}
                      placeholder={t('order.fields.bagNumberPlaceholder')}
                      onChange={(event) =>
                        form.setValue(`packages.${index}.bag_number`, event.target.value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    />
                    {getPackageError(index, 'bag_number') && (
                      <p className="text-sm text-destructive">
                        {translateValidationKey(getPackageError(index, 'bag_number')!, t)}
                      </p>
                    )}
                  </div>
                ))}

                <div className="space-y-1">
                  <Label>{t('order.fields.packageDescription')}</Label>
                  <Input
                    value={first.description ?? ''}
                    placeholder={t('order.fields.packageDescriptionPlaceholder')}
                    onChange={(event) => updateGroup(group, { description: event.target.value })}
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  {isOptionEnabled('fragile') && (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!first.fragile}
                        onCheckedChange={(checked) => updateGroup(group, { fragile: !!checked })}
                      />
                      {t('order.fields.fragile')}
                    </label>
                  )}
                  {isOptionEnabled('perishable') && (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!first.perishable}
                        onCheckedChange={(checked) => updateGroup(group, { perishable: !!checked })}
                      />
                      {t('order.fields.perishable')}
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!first.value_over_1000}
                      onCheckedChange={(checked) => {
                        const on = !!checked;
                        updateGroup(group, {
                          value_over_1000: on,
                          ...(on
                            ? {}
                            : {
                                declared_value_chf: undefined as unknown as number,
                                extra_insurance: false,
                              }),
                        });
                      }}
                    />
                    {t('order.fields.declaredValueOver1000')}
                  </label>
                  {first.value_over_1000 &&
                    isOptionEnabled('extra_insurance') &&
                    shouldOfferExtraInsurance(
                      typeof first.declared_value_chf === 'number' ? first.declared_value_chf : null,
                    ) && (
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!first.extra_insurance}
                          onCheckedChange={(checked) =>
                            updateGroup(group, { extra_insurance: !!checked })
                          }
                        />
                        {t('order.fields.extraInsurance')}
                      </label>
                    )}
                </div>

                {first.value_over_1000 && (
                  <div className="max-w-xs space-y-1">
                    <Label>{t('order.fields.declaredValueAmount')} *</Label>
                    <Input
                      type="number"
                      min={1000}
                      step="0.01"
                      value={first.declared_value_chf ?? ''}
                      onChange={(event) => {
                        const next =
                          event.target.value === '' ? undefined : Number(event.target.value);
                        updateGroup(group, { declared_value_chf: next as unknown as number });
                      }}
                    />
                    {getPackageError(group.indexes[0]!, 'declared_value_chf') && (
                      <p className="text-sm text-destructive">
                        {translateValidationKey(
                          getPackageError(group.indexes[0]!, 'declared_value_chf')!,
                          t,
                        )}
                      </p>
                    )}
                  </div>
                )}

                {getPackageError(group.indexes[0]!, 'weight') && (
                  <p className="text-sm text-destructive">
                    {translateValidationKey(getPackageError(group.indexes[0]!, 'weight')!, t)}
                  </p>
                )}

                <div className="space-y-1">
                  <Label>{t('order.fields.goodsPhoto')}</Label>
                  <Button type="button" variant="outline" size="sm" disabled={uploadingIndex === group.indexes[0]} asChild>
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingIndex === group.indexes[0]
                        ? t('common.loading')
                        : t('order.actions.uploadPhoto')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => onPhoto(group.indexes[0]!, event)}
                      />
                    </label>
                  </Button>
                  {first.goods_photo_url && (
                    <p className="text-sm text-green-600">{t('order.packages.photoAdded')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {packages.length > 0 && (
        <p className="text-right text-sm font-semibold">
          {t('order.packages.totalWeight')} {formatKg(totalKg)} kg
        </p>
      )}

      {packagesRootError && (
        <p className="text-sm text-destructive">{translateValidationKey(packagesRootError, t)}</p>
      )}
    </div>
  );
}

/** Trois cases L × l × h. Le poids IATA se recalcule tout seul quand on les change. */
function DimensionInputs({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const parts = (value ?? '')
    .replace(/cm/i, '')
    .split(/[×x]/)
    .map((part) => part.trim());
  const length = parts[0] ?? '';
  const width = parts[1] ?? '';
  const height = parts[2] ?? '';

  function update(next: [string, string, string]) {
    const [l, w, h] = next;
    if (!l && !w && !h) onChange('');
    else onChange(`${l}×${w}×${h} cm`);
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        placeholder="L"
        value={length}
        onChange={(event) => update([event.target.value, width, height])}
        className="w-14 text-center"
        aria-label="Longueur"
      />
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        min="0"
        placeholder="l"
        value={width}
        onChange={(event) => update([length, event.target.value, height])}
        className="w-14 text-center"
        aria-label="Largeur"
      />
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        min="0"
        placeholder="h"
        value={height}
        onChange={(event) => update([length, width, event.target.value])}
        className="w-14 text-center"
        aria-label="Hauteur"
      />
      <span className="text-xs text-muted-foreground">cm</span>
    </div>
  );
}
