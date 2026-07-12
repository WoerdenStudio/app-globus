import type { OperatingHoursSettings } from '../types';
import {
  DEFAULT_OPERATING_HOURS,
  isDayClosed,
  isSaturday,
  isSunday,
  timeToMinutes,
} from './operatingHours';

/**
 * Numéro de La Vélopostale à afficher quand les commandes en ligne sont fermées.
 * Les collaborateurs peuvent alors passer commande par téléphone.
 */
export const VELOPOSTALE_PHONE = '022 321 18 28';

/** Lien cliquable (indicatif Suisse +41, sans le 0 initial) */
export const VELOPOSTALE_PHONE_TEL = '+41223211828';

/**
 * Heure à partir de laquelle, en semaine (lun–ven), plus aucune commande
 * en ligne n'est possible — ni pour aujourd'hui, ni pour un autre jour.
 * À 17h30 pile, c'est déjà fermé.
 */
export const WEEKDAY_ORDERING_CLOSE_TIME = '17:30';

/**
 * Indique si les commandes en ligne sont totalement fermées « maintenant ».
 *
 * Fermé dans ces cas :
 * - le jour actuel est coché « Fermé » dans l'admin (dimanche l'est par défaut)
 * - lundi à vendredi à partir de 17h30 inclus
 *
 * Si l'admin décoche « Fermé » pour le dimanche, on peut commander le dimanche.
 * Le samedi (et un dimanche ouvert) n'ont pas la fermeture globale 17h30.
 */
export function isOrderingClosed(
  now: Date = new Date(),
  operatingHours: OperatingHoursSettings = DEFAULT_OPERATING_HOURS,
): boolean {
  // Jour marqué « Fermé » dans l'admin → message téléphone, pas de formulaire
  if (isDayClosed(now, operatingHours)) {
    return true;
  }

  // Samedi, ou dimanche ouvert : pas de fermeture globale à 17h30
  if (isSaturday(now) || isSunday(now)) {
    return false;
  }

  // Lundi–vendredi : fermé à partir de 17h30 pile
  const closeMinutes = timeToMinutes(WEEKDAY_ORDERING_CLOSE_TIME);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= closeMinutes;
}
