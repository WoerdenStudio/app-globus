import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCHF(amount: number | null | undefined): string {
  if (amount == null) return '—';

  // Format fixe (pas Intl) pour éviter les différences serveur/navigateur
  // qui provoquent une erreur d'hydratation (ex. 1'000 vs 1000).
  const negative = amount < 0;
  const [intPart, decPart] = Math.abs(amount).toFixed(2).split('.');
  const withSeparators = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${negative ? '-' : ''}${withSeparators}.${decPart} CHF`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/** Traduit une clé de validation Zod en message lisible */
export function translateValidationKey(
  key: string,
  t: (key: string) => string,
): string {
  if (key.startsWith('order.validation.')) {
    return t(key);
  }
  return key;
}
