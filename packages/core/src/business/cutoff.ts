import type { CutoffSettings } from '../types';
import { isSaturday, timeToMinutes } from './operatingHours';

/**
 * Vérifie si une commande pour une date donnée respecte les heures limites (cutoff).
 * Pour une commande le jour même : l'heure actuelle doit être avant le cutoff.
 * Pour une commande future : toujours OK (tant que le jour n'est pas fermé).
 */
export function isWithinCutoff(
  now: Date,
  requestedDate: Date,
  cutoffs: CutoffSettings,
): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const requested = new Date(
    requestedDate.getFullYear(),
    requestedDate.getMonth(),
    requestedDate.getDate(),
  );

  // Commande pour un jour futur : pas de contrainte de cutoff horaire
  if (requested.getTime() > today.getTime()) {
    return true;
  }

  // Commande pour aujourd'hui : vérifier le cutoff
  if (requested.getTime() === today.getTime()) {
    const cutoffTime = isSaturday(requested) ? cutoffs.saturday : cutoffs.weekday;
    const cutoffMinutes = timeToMinutes(cutoffTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes <= cutoffMinutes;
  }

  // Date passée
  return false;
}

/** Retourne le cutoff applicable pour une date */
export function getCutoffForDate(date: Date, cutoffs: CutoffSettings): string {
  return isSaturday(date) ? cutoffs.saturday : cutoffs.weekday;
}
