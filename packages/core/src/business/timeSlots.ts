import type { OperatingHoursSettings, TimeSlot } from '../types';
import {
  formatSlotLabel,
  getDayHours,
  isDayClosed,
  minutesToTime,
  timeToMinutes,
} from './operatingHours';

const SLOT_DURATION_MINUTES = 120; // fenêtres de 2 heures
const SLOT_STEP_MINUTES = 30; // proposées toutes les 30 minutes

/** Compare uniquement année / mois / jour (ignore l'heure) */
function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Génère les créneaux horaires pour une date donnée.
 * Règle : fenêtres de 2h toutes les 30 min dans les horaires d'ouverture.
 * Dernier créneau : 17h30-19h30 (tous les jours ouverts).
 *
 * Pour une commande le jour même : on masque les créneaux déjà commencés.
 * Ex. à 9h01 → plus de 9h00-11h00, premier créneau possible = 9h30-11h30.
 *
 * NOTE : ambiguïté dans le brief (exemples 1h vs règle 2h) — isolé ici pour ajustement facile.
 */
export function generateTimeSlots(
  date: Date,
  settings: OperatingHoursSettings,
  now: Date = new Date(),
): TimeSlot[] {
  if (isDayClosed(date, settings)) {
    return [];
  }

  const dayHours = getDayHours(date, settings);
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);

  // Dernier créneau spécifique (ajouté si absent de la génération standard)
  const lastSlotStart = timeToMinutes('17:30');
  const lastSlotEnd = timeToMinutes('19:30');

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

  const sorted = slots.sort((a, b) => a.startMinutes - b.startMinutes);

  // Jour même : garder uniquement les créneaux qui n'ont pas encore commencé
  if (isSameCalendarDay(date, now)) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return sorted.filter((slot) => slot.startMinutes > nowMinutes);
  }

  return sorted;
}

/** Vérifie qu'un créneau fait partie des créneaux valides du jour (heure actuelle incluse) */
export function isValidTimeSlot(
  date: Date,
  slotValue: string,
  settings: OperatingHoursSettings,
  now: Date = new Date(),
): boolean {
  const slots = generateTimeSlots(date, settings, now);
  return slots.some((s) => s.value === slotValue);
}
