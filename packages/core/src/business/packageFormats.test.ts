import { describe, expect, it } from 'vitest';
import {
  billedWeightKg,
  iataWeightKg,
  packagesInDisplayOrder,
  summarizePackage,
  totalBilledWeightKg,
} from './packageFormats';
import { isOutOfTariffZone, quoteDeliveryPrice } from './velopostaleTariff';
import { getOrderInsurance, insurancePremiumChf } from './pricing';

describe('poids IATA', () => {
  it('calcule Sac en carton S : 20 × 6 × 21 cm = 0,42 kg', () => {
    expect(iataWeightKg('20×6×21 cm')).toBe(0.42);
  });

  it('calcule Sac à gâteau L : 41 × 41 × 41 cm ≈ 11,487 kg', () => {
    expect(iataWeightKg('41×41×41 cm')).toBe(11.487);
  });

  it('retient le plus élevé entre le poids réel et le poids IATA', () => {
    expect(billedWeightKg(1, '20×6×21 cm')).toBe(1);
    expect(billedWeightKg(4, '54×12×48 cm')).toBe(5.184);
  });

  it('résume un format avec les trois poids', () => {
    expect(
      summarizePackage({
        package_type: 'gateau-s',
        weight: 2,
        dimensions: '32×22×26 cm',
      }),
    ).toMatchObject({
      formatLabel: 'Sac à gâteau S',
      actualKg: 2,
      billedKg: 3.051,
    });
  });

  it('additionne le poids retenu de chaque colis', () => {
    expect(
      totalBilledWeightKg([
        { weight: 5, dimensions: '35×35×35 cm' },
        { weight: 2, dimensions: '10×10×10 cm' },
      ]),
    ).toBe(9.146);
  });
});

describe('tarif standard Vélopostale', () => {
  it('facture 18 CHF à Genève sous 5 kg', () => {
    expect(
      quoteDeliveryPrice('Rue du Rhône 48, 1204 Genève', [
        { weight: 1, dimensions: '20×6×21 cm' },
      ]),
    ).toBe(18);
  });

  it('ajoute 18 CHF entre 5 et 20 kg', () => {
    expect(
      quoteDeliveryPrice('Rue du Rhône 48, 1204 Genève', [
        { weight: 5, dimensions: '41×41×41 cm' },
      ]),
    ).toBe(36);
  });

  it('distingue Onex et Petit-Lancy, qui partagent le code 1213', () => {
    const pkg = [{ weight: 1, dimensions: '20×6×21 cm' }];
    expect(quoteDeliveryPrice('Route de Chancy 1, 1213 Onex', pkg)).toBe(33);
    expect(quoteDeliveryPrice('Chemin de la Mairie 1, 1213 Petit-Lancy', pkg)).toBe(26);
  });

  it('ne donne pas de prix au-dessus de 40 kg', () => {
    expect(
      quoteDeliveryPrice('Rue du Rhône 48, 1204 Genève', [
        { weight: 41, dimensions: '10×10×10 cm' },
      ]),
    ).toBeNull();
  });

  it('ne donne pas de prix hors de la grille', () => {
    expect(
      quoteDeliveryPrice('Rue du Marché 1, 1000 Lausanne', [
        { weight: 1, dimensions: '20×6×21 cm' },
      ]),
    ).toBeNull();
  });

  it('repère une adresse hors des codes postaux de la grille', () => {
    expect(isOutOfTariffZone('Rue du Marché 1, 1000 Lausanne')).toBe(true);
    expect(isOutOfTariffZone('Rue du Rhône 48, 1204 Genève')).toBe(false);
    expect(isOutOfTariffZone('')).toBe(false);
  });

  it("ajoute l'assurance au tarif : 20 CHF, puis +1 CHF par palier de 1'000", () => {
    const address = 'Rue du Rhône 48, 1204 Genève';
    const carton = [{ weight: 1, dimensions: '20×6×21 cm' }];
    expect(quoteDeliveryPrice(address, carton, 1200)).toBe(38);
    expect(quoteDeliveryPrice(address, carton, 2200)).toBe(39);
    expect(quoteDeliveryPrice(address, carton, 3000)).toBe(40);
  });

  it("facture l'assurance une seule fois pour toute la commande", () => {
    expect(
      quoteDeliveryPrice(
        'Rue du Rhône 48, 1204 Genève',
        [
          { weight: 1, dimensions: '20×6×21 cm' },
          { weight: 1, dimensions: '22×11×33 cm' },
        ],
        3400,
      ),
    ).toBe(40);
  });

  it("n'ajoute pas d'assurance hors grille : toujours pas de prix affiché", () => {
    expect(
      quoteDeliveryPrice('Rue du Marché 1, 1000 Lausanne', [{ weight: 1, dimensions: '20×6×21 cm' }], 2200),
    ).toBeNull();
  });
});

describe('assurance', () => {
  it('suit les exemples 1 200 → 20 CHF et 2 200 → 21 CHF', () => {
    expect(insurancePremiumChf(1200)).toBe(20);
    expect(insurancePremiumChf(2200)).toBe(21);
    expect(insurancePremiumChf(1000)).toBe(20);
    expect(insurancePremiumChf(999)).toBe(0);
    expect(insurancePremiumChf(undefined)).toBe(0);
  });

  it('lit l’assurance de la commande complète', () => {
    expect(getOrderInsurance({ declared_value_chf: 3400, extra_insurance: false })).toEqual({
      declaredValueChf: 3400,
      extraInsurance: false,
    });
    expect(getOrderInsurance({ declared_value_chf: null, packages: [] })).toEqual({
      declaredValueChf: null,
      extraInsurance: false,
    });
  });

  it('additionne les montants des anciennes commandes (un par groupe de sacs)', () => {
    expect(
      getOrderInsurance({
        declared_value_chf: null,
        packages: [
          { line_id: 'a', declared_value_chf: 1200 },
          { line_id: 'a', declared_value_chf: 1200 },
          { line_id: 'b', declared_value_chf: 2200, extra_insurance: true },
        ],
      }),
    ).toEqual({ declaredValueChf: 3400, extraInsurance: true });
  });
});

describe('ordre des colis', () => {
  it('regroupe les sacs d’un même format, dans l’ordre d’ajout des groupes', () => {
    const ordered = packagesInDisplayOrder([
      { line_id: 'a', package_type: 'carton-s', bag_number: '1' },
      { line_id: 'b', package_type: 'isotherme-s', bag_number: '2' },
      { line_id: 'a', package_type: 'carton-s', bag_number: '3' },
    ]);
    expect(ordered.map((pkg) => pkg.bag_number)).toEqual(['1', '3', '2']);
  });
});
