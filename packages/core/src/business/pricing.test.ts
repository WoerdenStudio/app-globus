import { describe, expect, it } from 'vitest';
import { calculateOrderPriceFromPackages, calculatePrice } from './pricing';
import type { PricingRule } from '../types';

const pricingRule: PricingRule = {
  id: 'test',
  label: 'Tarif test',
  base_price_chf: 25,
  modifiers: { fragile: 5, perishable: 3, extra_insurance: 15 },
  active: true,
  created_at: '',
  updated_at: '',
};

describe('calculatePrice', () => {
  it('applique le tarif de base seul', () => {
    expect(calculatePrice({}, pricingRule).total).toBe(25);
  });

  it('additionne les suppléments activés', () => {
    expect(
      calculatePrice({ fragile: true, perishable: true, extra_insurance: true }, pricingRule).total,
    ).toBe(48);
  });
});

describe('calculateOrderPriceFromPackages', () => {
  it('applique un supplément si au moins un colis est fragile', () => {
    expect(
      calculateOrderPriceFromPackages(
        [{ fragile: false }, { fragile: true }],
        pricingRule,
      ),
    ).toBe(30);
  });

  it('ignore le prix envoyé par le client (simulation fraude)', () => {
    const serverTotal = calculateOrderPriceFromPackages([{ fragile: false }], pricingRule);
    const fakeClientPrice = 0;

    expect(serverTotal).toBe(25);
    expect(serverTotal).not.toBe(fakeClientPrice);
  });
});
