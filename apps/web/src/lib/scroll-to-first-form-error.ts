import type { FieldErrors } from 'react-hook-form';
import type { OrderFormData } from '@globus/core/schemas';

/** Ordre d'affichage des champs dans le formulaire de commande (haut → bas). */
const FORM_FIELD_ORDER = [
  'pickup_location_id',
  'pickup_address_custom',
  'client_name',
  'client_phone',
  'delivery_address',
  'floor',
  'access_type',
  'access_detail',
  'hotel_name',
  'hotel_room_number',
  'requested_date',
  'requested_time_slot',
] as const;

const PACKAGE_FIELD_ORDER = [
  'bag_number',
  'weight',
  'declared_value_chf',
  'extra_insurance',
] as const;

function isFieldError(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}

/** Trouve le premier champ en erreur selon l'ordre du formulaire. */
function findFirstErrorPath(errors: FieldErrors<OrderFormData>): string | null {
  for (const field of FORM_FIELD_ORDER) {
    if (isFieldError(errors[field])) {
      return field;
    }
  }

  const packageErrors = errors.packages;
  if (!packageErrors) {
    return null;
  }

  // Erreur globale sur la liste de colis (ex. aucun colis)
  if (isFieldError(packageErrors) || isFieldError(packageErrors.root)) {
    return 'packages.0.bag_number';
  }

  if (Array.isArray(packageErrors)) {
    for (let index = 0; index < packageErrors.length; index++) {
      const row = packageErrors[index];
      if (!row || typeof row !== 'object') continue;

      for (const field of PACKAGE_FIELD_ORDER) {
        if (isFieldError(row[field])) {
          return `packages.${index}.${field}`;
        }
      }
    }
  }

  return null;
}

/**
 * Fait défiler la page jusqu'au premier champ invalide et place le focus dessus.
 * Chaque bloc de champ doit avoir l'attribut `data-form-field="nom_du_champ"`.
 */
export function scrollToFirstFormError(errors: FieldErrors<OrderFormData>): void {
  const path = findFirstErrorPath(errors);
  if (!path) return;

  // Attendre que React affiche les messages d'erreur en rouge.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const anchor = document.querySelector(`[data-form-field="${path}"]`);
      if (!anchor) return;

      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Priorité : listes déroulantes (Radix = bouton role=combobox), puis inputs.
      const focusable =
        anchor.querySelector<HTMLElement>('button[role="combobox"]') ??
        anchor.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([readonly]), textarea, select, [role="combobox"]',
        );

      focusable?.focus({ preventScroll: true });
    });
  });
}
