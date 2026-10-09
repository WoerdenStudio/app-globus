'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  PINNED_PHONE_CODES,
  OTHER_PHONE_CODES,
  ALL_PHONE_CODES,
  findPhoneCodeById,
  formatPhoneNumber,
  parsePhoneNumber,
  type PhoneCode,
} from '@/lib/phone-codes';

interface PhoneInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
}

export function PhoneInput({
  id = 'client-phone',
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
}: PhoneInputProps) {
  const t = useTranslations('order.phone');
  const parsed = parsePhoneNumber(value);
  const [countryId, setCountryId] = useState(parsed.id);
  const [localNumber, setLocalNumber] = useState(parsed.number);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = findPhoneCodeById(countryId) ?? ALL_PHONE_CODES[0]!;

  // Resynchroniser si la valeur externe change (ex. brouillon restauré)
  useEffect(() => {
    const next = parsePhoneNumber(value);
    setCountryId(next.id);
    setLocalNumber(next.number);
  }, [value]);

  // Fermer la liste si on clique ailleurs, ou avec Échap
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Le curseur reste dans la recherche dès que la liste s'ouvre
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const needle = search.trim().toLowerCase();
  const filteredPinned = useMemo(
    () => PINNED_PHONE_CODES.filter((item) => matchesSearch(item, needle)),
    [needle],
  );
  const filteredOthers = useMemo(
    () => OTHER_PHONE_CODES.filter((item) => matchesSearch(item, needle)),
    [needle],
  );

  function emitChange(code: string, number: string) {
    onChange(formatPhoneNumber(code, number));
  }

  function handleCountryChange(nextId: string) {
    const item = findPhoneCodeById(nextId);
    if (!item) return;
    setCountryId(nextId);
    emitChange(item.code, localNumber);
    setOpen(false);
    setSearch('');
  }

  function handleNumberChange(number: string) {
    const cleaned = number.replace(/[^\d\s]/g, '');
    setLocalNumber(cleaned);
    emitChange(selected.code, cleaned);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div ref={boxRef} className="relative shrink-0">
          <button
            type="button"
            className="flex h-10 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label={t('countryCode')}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="truncate">
              {selected.code} {selected.country}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>

          {open && (
            <div className="absolute z-50 mt-1 w-[min(calc(100vw-2rem),20rem)] rounded-md border bg-popover text-popover-foreground shadow-md">
              <div className="border-b p-2">
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('searchCountry')}
                  className="h-8"
                />
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {filteredPinned.length > 0 && (
                  <CountryGroup
                    label={t('pinned')}
                    items={filteredPinned}
                    selectedId={countryId}
                    onSelect={handleCountryChange}
                  />
                )}
                {filteredOthers.length > 0 && (
                  <CountryGroup
                    label={t('others')}
                    items={filteredOthers}
                    selectedId={countryId}
                    onSelect={handleCountryChange}
                  />
                )}
                {filteredPinned.length === 0 && filteredOthers.length === 0 && (
                  <p className="px-2 py-2 text-sm text-muted-foreground">{t('noCountry')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <Input
          id={id}
          type="tel"
          inputMode="tel"
          value={localNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? t('placeholder')}
          className={cn('flex-1', error && 'border-destructive focus-visible:ring-destructive')}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function matchesSearch(item: PhoneCode, needle: string): boolean {
  if (!needle) return true;
  return item.country.toLowerCase().includes(needle) || item.code.includes(needle);
}

function CountryGroup({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: PhoneCode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="py-1">
      <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
            item.id === selectedId && 'bg-accent',
          )}
          onClick={() => onSelect(item.id)}
        >
          {item.code} {item.country}
        </button>
      ))}
    </div>
  );
}
