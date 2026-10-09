import { DECLARED_VALUE_MIN_CHF } from '../types/enums';

/** Prix de base de l'assurance (couvre le premier palier de 1'000 CHF). */
export const INSURANCE_BASE_CHF = 20;

/** 1 CHF de plus à chaque palier de 1'000 CHF au-dessus du minimum. */
export const INSURANCE_PER_THOUSAND_CHF = 1;

/** Indique si l'assurance complémentaire doit être proposée */
export function shouldOfferExtraInsurance(declaredValue: number | null | undefined): boolean {
  return declaredValue != null && declaredValue > 5000;
}

/**
 * Coût de l'assurance pour un montant déclaré.
 * Exemples : 1'200 CHF → 20 CHF, 2'200 CHF → 21 CHF, 3'000 CHF → 22 CHF.
 * 0 si le montant n'est pas encore saisi (ou sous le minimum de 1'000 CHF).
 */
export function insurancePremiumChf(declaredValue: number | null | undefined | ''): number {
  if (typeof declaredValue !== 'number' || !Number.isFinite(declaredValue)) return 0;
  if (declaredValue < DECLARED_VALUE_MIN_CHF) return 0;
  const extraThousands = Math.floor((declaredValue - DECLARED_VALUE_MIN_CHF) / 1000);
  return INSURANCE_BASE_CHF + extraThousands * INSURANCE_PER_THOUSAND_CHF;
}

/** Assurance de la commande complète (valeur déclarée + assurance complémentaire) */
export interface OrderInsurance {
  declaredValueChf: number | null;
  extraInsurance: boolean;
}

/**
 * Assurance d'une commande enregistrée. Elle est désormais saisie une seule
 * fois pour toute la commande (colonnes `declared_value_chf` / `extra_insurance`).
 * Les commandes plus anciennes l'avaient par groupe de sacs : on additionne
 * alors les montants (un par groupe) pour garder l'affichage cohérent.
 */
export function getOrderInsurance(order: {
  declared_value_chf?: number | string | null;
  extra_insurance?: boolean | null;
  packages?:
    | {
        line_id?: string | null;
        declared_value_chf?: number | string | null;
        extra_insurance?: boolean | null;
      }[]
    | null;
}): OrderInsurance {
  const orderValue =
    order.declared_value_chf != null ? Number(order.declared_value_chf) : null;
  if (orderValue != null && Number.isFinite(orderValue) && orderValue > 0) {
    return { declaredValueChf: orderValue, extraInsurance: !!order.extra_insurance };
  }

  const seen = new Set<string>();
  let total = 0;
  let extraInsurance = !!order.extra_insurance;
  (order.packages ?? []).forEach((pkg, index) => {
    if (pkg.extra_insurance) extraInsurance = true;
    const key = pkg.line_id ? `line:${pkg.line_id}` : `idx:${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    const value = pkg.declared_value_chf != null ? Number(pkg.declared_value_chf) : 0;
    if (Number.isFinite(value)) total += value;
  });

  return { declaredValueChf: total > 0 ? total : null, extraInsurance };
}
