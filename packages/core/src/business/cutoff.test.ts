import { describe, it, expect } from 'vitest';
import { isWithinCutoff, getCutoffForDate } from './cutoff';
import { DEFAULT_CUTOFFS } from './operatingHours';

describe('isWithinCutoff', () => {
  it('autorise une commande pour un jour futur', () => {
    const now = new Date('2025-06-23T18:00:00'); // lundi 18h (après cutoff)
    const futureDate = new Date('2025-06-25T12:00:00'); // mercredi
    expect(isWithinCutoff(now, futureDate, DEFAULT_CUTOFFS)).toBe(true);
  });

  it('autorise une commande le jour même avant le cutoff en semaine', () => {
    const now = new Date('2025-06-23T17:00:00'); // lundi 17h00
    const today = new Date('2025-06-23T12:00:00');
    expect(isWithinCutoff(now, today, DEFAULT_CUTOFFS)).toBe(true);
  });

  it('refuse une commande le jour même après le cutoff en semaine (17h30)', () => {
    const now = new Date('2025-06-23T17:45:00'); // lundi 17h45
    const today = new Date('2025-06-23T12:00:00');
    expect(isWithinCutoff(now, today, DEFAULT_CUTOFFS)).toBe(false);
  });

  it('autorise une commande le samedi avant 17h00', () => {
    const now = new Date('2025-06-28T16:30:00');
    const saturday = new Date('2025-06-28T12:00:00');
    expect(isWithinCutoff(now, saturday, DEFAULT_CUTOFFS)).toBe(true);
  });

  it('refuse une commande le samedi après 17h00', () => {
    const now = new Date('2025-06-28T17:15:00');
    const saturday = new Date('2025-06-28T12:00:00');
    expect(isWithinCutoff(now, saturday, DEFAULT_CUTOFFS)).toBe(false);
  });

  it('refuse une commande pour une date passée', () => {
    const now = new Date('2025-06-25T10:00:00');
    const pastDate = new Date('2025-06-20T12:00:00');
    expect(isWithinCutoff(now, pastDate, DEFAULT_CUTOFFS)).toBe(false);
  });
});

describe('getCutoffForDate', () => {
  it('retourne le cutoff semaine pour un lundi', () => {
    const monday = new Date('2025-06-23T12:00:00');
    expect(getCutoffForDate(monday, DEFAULT_CUTOFFS)).toBe('17:30');
  });

  it('retourne le cutoff samedi pour un samedi', () => {
    const saturday = new Date('2025-06-28T12:00:00');
    expect(getCutoffForDate(saturday, DEFAULT_CUTOFFS)).toBe('17:00');
  });
});
