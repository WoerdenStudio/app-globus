import { describe, expect, it } from 'vitest';
import { hasStreetNumber, parseDimensionsCm, parseSwissAddress } from './swissAddress';

describe('parseSwissAddress', () => {
  it('découpe une adresse standard', () => {
    const result = parseSwissAddress('Rue de la Servette 42, 1200 Genève');
    expect(result.street).toBe('Rue de la Servette');
    expect(result.streetNumber).toBe('42');
    expect(result.zip).toBe('1200');
    expect(result.city).toBe('Genève');
  });

  it('gère un suffixe de numéro', () => {
    const result = parseSwissAddress('Avenue Test 12A, 8001 Zürich');
    expect(result.streetNumber).toBe('12');
    expect(result.streetNumberSuffix).toBe('A');
  });

  it('retourne au minimum la rue si le format est incomplet', () => {
    const result = parseSwissAddress('Quai de chargement');
    expect(result.street).toBe('Quai de chargement');
    expect(result.country).toBe('CH');
  });
});

describe('hasStreetNumber', () => {
  it('détecte un numéro de rue', () => {
    expect(hasStreetNumber('Rue de la Servette 42, 1200 Genève')).toBe(true);
    expect(hasStreetNumber("Chemin de l'Adret 8, 1212 Lancy")).toBe(true);
  });

  it('rejette une adresse sans numéro', () => {
    expect(hasStreetNumber('Quai de chargement, 1200 Genève')).toBe(false);
    expect(hasStreetNumber('')).toBe(false);
  });
});

describe('parseDimensionsCm', () => {
  it('parse des dimensions avec ×', () => {
    expect(parseDimensionsCm('30×20×15 cm')).toEqual({
      length_cm: 30,
      width_cm: 20,
      height_cm: 15,
    });
  });

  it('retourne vide si absent', () => {
    expect(parseDimensionsCm(null)).toEqual({});
  });
});
