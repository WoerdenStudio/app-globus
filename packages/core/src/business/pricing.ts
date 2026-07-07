import type { PricingRule } from '../types';

export interface PriceCalculationInput {
  fragile?: boolean;
  perishable?: boolean;
  extra_insurance?: boolean;
  declared_value_chf?: number | null;
  weight?: number | null;
}

export interface PriceCalculationResult {
  basePrice: number;
  modifiers: { key: string; amount: number }[];
  total: number;
}

/**
 * Calcule le tarif d'une commande à partir d'une règle tarifaire.
 * Hypothèse : tarif de base paramétrable + modificateurs extensibles.
 * La vraie grille Vélopostale pourra remplacer cette logique plus tard.
 */
export function calculatePrice(
  input: PriceCalculationInput,
  pricingRule: PricingRule,
): PriceCalculationResult {
  const basePrice = Number(pricingRule.base_price_chf);
  const modifiers: { key: string; amount: number }[] = [];

  const ruleModifiers = pricingRule.modifiers as Record<string, number>;

  if (input.fragile && ruleModifiers.fragile) {
    modifiers.push({ key: 'fragile', amount: ruleModifiers.fragile });
  }
  if (input.perishable && ruleModifiers.perishable) {
    modifiers.push({ key: 'perishable', amount: ruleModifiers.perishable });
  }
  if (input.extra_insurance && ruleModifiers.extra_insurance) {
    modifiers.push({ key: 'extra_insurance', amount: ruleModifiers.extra_insurance });
  }

  const modifierTotal = modifiers.reduce((sum, m) => sum + m.amount, 0);
  const total = Math.round((basePrice + modifierTotal) * 100) / 100;

  return { basePrice, modifiers, total };
}

/** Options de colis qui influencent le tarif (fragile, périssable, assurance) */
export interface OrderPackagePricingFlags {
  fragile?: boolean;
  perishable?: boolean;
  extra_insurance?: boolean;
}

/**
 * Calcule le tarif d'une commande à partir de ses colis et de la règle active.
 * Un supplément s'applique si AU MOINS un colis a l'option concernée.
 */
export function calculateOrderPriceFromPackages(
  packages: OrderPackagePricingFlags[],
  pricingRule: PricingRule,
): number {
  const anyFragile = packages.some((pkg) => pkg.fragile);
  const anyPerishable = packages.some((pkg) => pkg.perishable);
  const anyInsurance = packages.some((pkg) => pkg.extra_insurance);

  return calculatePrice(
    {
      fragile: anyFragile,
      perishable: anyPerishable,
      extra_insurance: anyInsurance,
    },
    pricingRule,
  ).total;
}

/** Indique si l'assurance complémentaire doit être proposée */
export function shouldOfferExtraInsurance(declaredValue: number | null | undefined): boolean {
  return declaredValue != null && declaredValue > 5000;
}
