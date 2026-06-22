import type { OperatingHoursSettings, TimeSlot } from '../types';
import {
  formatSlotLabel,
  getDayHours,
  isDayClosed,
  isSaturday,
  minutesToTime,
  timeToMinutes,
} from './operatingHours';

const SLOT_DURATION_MINUTES = 120; // fenêtres de 2 heures
const SLOT_STEP_MINUTES = 30; // proposées toutes les 30 minutes

/**
 * Génère les créneaux horaires pour une date donnée.
 * Règle : fenêtres de 2h toutes les 30 min dans les horaires d'ouverture.
 * Dernier créneau : 17h30-19h30 en semaine, 17h00-19h00 le samedi.
 *
 * NOTE : ambiguïté dans le brief (exemples 1h vs règle 2h) — isolé ici pour ajustement facile.
 */
export function generateTimeSlots(
  date: Date,
  settings: OperatingHoursSettings,
): TimeSlot[] {
  if (isDayClosed(date, settings)) {
    return [];
  }

  const dayHours = getDayHours(date, settings);
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);

  // Dernier créneau spécifique selon le jour
  const lastSlotStart = isSaturday(date)
    ? timeToMinutes('17:00')
    : timeToMinutes('17:30');
  const lastSlotEnd = isSaturday(date)
    ? timeToMinutes('19:00')
    : timeToMinutes('19:30');

  const slots: TimeSlot[] = [];
  const seen = new Set<string>();

  // Génération standard : fenêtres de 2h toutes les 30 min
  for (
    let start = openMinutes;
    start + SLOT_DURATION_MINUTES <= closeMinutes;
    start += SLOT_STEP_MINUTES
  ) {
    const end = start + SLOT_DURATION_MINUTES;
    const value = `${minutesToTime(start)}-${minutesToTime(end)}`;

    if (!seen.has(value)) {
      seen.add(value);
      slots.push({
        value,
        label: formatSlotLabel(start, end),
        startMinutes: start,
        endMinutes: end,
      });
    }
  }

  // Ajouter le dernier créneau spécifique s'il n'est pas déjà présent
  const lastValue = `${minutesToTime(lastSlotStart)}-${minutesToTime(lastSlotEnd)}`;
  if (!seen.has(lastValue) && lastSlotStart < lastSlotEnd) {
    slots.push({
      value: lastValue,
      label: formatSlotLabel(lastSlotStart, lastSlotEnd),
      startMinutes: lastSlotStart,
      endMinutes: lastSlotEnd,
    });
  }

  return slots.sort((a, b) => a.startMinutes - b.startMinutes);
}

/** Vérifie qu'un créneau fait partie des créneaux valides du jour */
export function isValidTimeSlot(
  date: Date,
  slotValue: string,
  settings: OperatingHoursSettings,
): boolean {
  const slots = generateTimeSlots(date, settings);
  return slots.some((s) => s.value === slotValue);
}
