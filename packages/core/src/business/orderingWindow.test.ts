import { describe, it, expect } from 'vitest';
import {
  isOrderingClosed,
  VELOPOSTALE_PHONE,
  WEEKDAY_ORDERING_CLOSE_TIME,
} from './orderingWindow';
import { DEFAULT_OPERATING_HOURS } from './operatingHours';
import type { OperatingHoursSettings } from '../types';

/** Horaires avec dimanche ouvert (admin a décoché « Fermé ») */
const SUNDAY_OPEN_HOURS: OperatingHoursSettings = {
  ...DEFAULT_OPERATING_HOURS,
  sunday: { open: '10:00', close: '16:00', closed: false },
};

describe('isOrderingClosed', () => {
  it('est fermé tout le dimanche si « Fermé » est coché (défaut)', () => {
    const sundayMorning = new Date('2025-06-22T10:00:00');
    const sundayEvening = new Date('2025-06-22T20:00:00');
    expect(isOrderingClosed(sundayMorning, DEFAULT_OPERATING_HOURS)).toBe(true);
    expect(isOrderingClosed(sundayEvening, DEFAULT_OPERATING_HOURS)).toBe(true);
  });

  it('est ouvert le dimanche si l’admin a décoché « Fermé »', () => {
    const sundayMorning = new Date('2025-06-22T10:00:00');
    expect(isOrderingClosed(sundayMorning, SUNDAY_OPEN_HOURS)).toBe(false);
  });

  it('est ouvert en semaine avant 17h30', () => {
    const monday = new Date('2025-06-23T17:29:00');
    expect(isOrderingClosed(monday, DEFAULT_OPERATING_HOURS)).toBe(false);
  });

  it('est fermé en semaine à 17h30 pile', () => {
    const monday = new Date('2025-06-23T17:30:00');
    expect(isOrderingClosed(monday, DEFAULT_OPERATING_HOURS)).toBe(true);
  });

  it('est fermé en semaine après 17h30', () => {
    const friday = new Date('2025-06-27T18:00:00');
    expect(isOrderingClosed(friday, DEFAULT_OPERATING_HOURS)).toBe(true);
  });

  it('n’applique pas la fermeture globale le samedi (même tard)', () => {
    const saturdayEvening = new Date('2025-06-28T18:00:00');
    expect(isOrderingClosed(saturdayEvening, DEFAULT_OPERATING_HOURS)).toBe(false);
  });

  it('expose le numéro et l’heure de fermeture attendus', () => {
    expect(VELOPOSTALE_PHONE).toBe('022 321 18 28');
    expect(WEEKDAY_ORDERING_CLOSE_TIME).toBe('17:30');
  });
});
