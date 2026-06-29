import type { DeliveryOptionConfig } from '../types';

/** Clé de l'option admin pour afficher le tarif aux collaborateurs */
export const SHOW_PRICING_OPTION_KEY = 'show_pricing';

/** Indique si une option de livraison est activée dans la configuration admin */
export function isDeliveryOptionEnabled(
  options: DeliveryOptionConfig[],
  key: string,
): boolean {
  return options.some((option) => option.key === key && option.enabled);
}

/** Afficher la section tarif et les montants sur les bons de commande */
export function isPricingVisibleToStaff(options: DeliveryOptionConfig[]): boolean {
  return isDeliveryOptionEnabled(options, SHOW_PRICING_OPTION_KEY);
}
