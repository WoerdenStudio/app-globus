import { describe, it, expect } from 'vitest';
import { generateTimeSlots, isValidTimeSlot } from './timeSlots';
import { DEFAULT_OPERATING_HOURS } from './operatingHours';

describe('generateTimeSlots', () => {
  it('retourne un tableau vide le dimanche quand il est fermé', () => {
    const sunday = new Date('2025-06-22T10:00:00'); // dimanche
    const slots = generateTimeSlots(sunday, DEFAULT_OPERATING_HOURS);
    expect(slots).toEqual([]);
  });

  it('génère des créneaux le dimanche si l’admin a décoché « Fermé »', () => {
    const sunday = new Date('2025-06-22T10:00:00');
    const hours = {
      ...DEFAULT_OPERATING_HOURS,
      sunday: { open: '10:00', close: '16:00', closed: false },
    };
    const slots = generateTimeSlots(sunday, hours);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.value).toBe('10:00-12:00');
  });

  it('génère des créneaux de 2h en semaine', () => {
    const monday = new Date('2025-06-23T10:00:00'); // lundi
    const slots = generateTimeSlots(monday, DEFAULT_OPERATING_HOURS);

    expect(slots.length).toBeGreaterThan(0);

    // Premier créneau commence à 8h00
    expect(slots[0]?.value).toBe('08:00-10:00');
    expect(slots[0]?.label).toBe('08h00 – 10h00');

    // Chaque créneau dure 2 heures
    for (const slot of slots) {
      expect(slot.endMinutes - slot.startMinutes).toBe(120);
    }
  });

  it('propose des créneaux toutes les 30 minutes en semaine', () => {
    const wednesday = new Date('2025-06-25T10:00:00');
    const slots = generateTimeSlots(wednesday, DEFAULT_OPERATING_HOURS);

    const starts = slots.map((s) => s.startMinutes);
    // Vérifie qu'on a des départs à 30 min d'intervalle (ex: 8h00, 8h30, 9h00...)
    expect(starts).toContain(8 * 60); // 08:00
    expect(starts).toContain(8 * 60 + 30); // 08:30
  });

  it('inclut le dernier créneau 17h30-19h30 en semaine', () => {
    const friday = new Date('2025-06-27T10:00:00');
    const slots = generateTimeSlots(friday, DEFAULT_OPERATING_HOURS);

    const lastSlot = slots.find((s) => s.value === '17:30-19:30');
    expect(lastSlot).toBeDefined();
    expect(lastSlot?.label).toBe('17h30 – 19h30');
    expect(slots.at(-1)?.value).toBe('17:30-19:30');
  });

  it('inclut le dernier créneau 17h30-19h30 le samedi', () => {
    const saturday = new Date('2025-06-28T10:00:00');
    const slots = generateTimeSlots(saturday, DEFAULT_OPERATING_HOURS);

    const lastSlot = slots.find((s) => s.value === '17:30-19:30');
    expect(lastSlot).toBeDefined();
    expect(lastSlot?.label).toBe('17h30 – 19h30');

    // Le samedi ouvre à 9h
    expect(slots[0]?.value).toBe('09:00-11:00');
  });

  it('isValidTimeSlot valide un créneau existant', () => {
    const monday = new Date('2025-06-23T10:00:00');
    expect(isValidTimeSlot(monday, '08:00-10:00', DEFAULT_OPERATING_HOURS)).toBe(true);
    expect(isValidTimeSlot(monday, '99:00-99:00', DEFAULT_OPERATING_HOURS)).toBe(false);
  });

  it('masque les créneaux déjà commencés pour une commande le jour même', () => {
    const today = new Date('2025-06-23T09:01:00'); // lundi 9h01
    const slots = generateTimeSlots(today, DEFAULT_OPERATING_HOURS, today);

    expect(slots.find((s) => s.value === '09:00-11:00')).toBeUndefined();
    expect(slots[0]?.value).toBe('09:30-11:30');
  });

  it('autorise encore le créneau à venir juste avant son début', () => {
    const today = new Date('2025-06-23T08:59:00'); // lundi 8h59
    const slots = generateTimeSlots(today, DEFAULT_OPERATING_HOURS, today);

    expect(slots.find((s) => s.value === '09:00-11:00')).toBeDefined();
  });

  it('ne filtre pas les créneaux pour une date future', () => {
    const now = new Date('2025-06-23T18:00:00'); // lundi soir
    const tomorrow = new Date('2025-06-24T12:00:00'); // mardi
    const slots = generateTimeSlots(tomorrow, DEFAULT_OPERATING_HOURS, now);

    expect(slots[0]?.value).toBe('08:00-10:00');
  });

  it('refuse un créneau déjà commencé via isValidTimeSlot', () => {
    const today = new Date('2025-06-23T09:01:00');
    expect(isValidTimeSlot(today, '09:00-11:00', DEFAULT_OPERATING_HOURS, today)).toBe(false);
    expect(isValidTimeSlot(today, '09:30-11:30', DEFAULT_OPERATING_HOURS, today)).toBe(true);
  });
});
