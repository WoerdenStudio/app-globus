import { describe, expect, it } from 'vitest';
import { billedWeightKg, iataWeightKg, summarizePackage, totalBilledWeightKg } from './packageFormats';
import { isOutOfTariffZone, quoteDeliveryPrice } from './velopostaleTariff';

describe('poids IATA', () => {
  it('calcule Carton S : 20 × 6 × 21 cm = 0,42 kg', () => {
    expect(iataWeightKg('20×6×21 cm')).toBe(0.42);
  });

  it('calcule Gâteau L : 41 × 41 × 41 cm ≈ 11,487 kg', () => {
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
      formatLabel: 'Gâteau S',
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
});
