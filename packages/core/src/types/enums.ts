import { z } from 'zod';

/** Rôles utilisateur */
export const userRoleSchema = z.enum(['collaborateur', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Départements Globus */
export const departmentSchema = z.enum(['service_client', 'service_cadeaux', 'autre']);
export type Department = z.infer<typeof departmentSchema>;

/** Type d'accès à la livraison */
export const accessTypeSchema = z.enum(['code', 'interphone', 'acces_libre', 'autre']);
export type AccessType = z.infer<typeof accessTypeSchema>;

/** Statut d'une commande */
export const orderStatusSchema = z.enum(['created', 'en_cours', 'livree', 'annulee']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Constante pour le lieu « Autres » (adresse libre) */
export const PICKUP_OTHER_VALUE = '__other__';

/** Seuil d'assurance complémentaire en CHF */
export const INSURANCE_THRESHOLD_CHF = 5000;

/** Montant minimum si la valeur déclarée dépasse 1'000 CHF */
export const DECLARED_VALUE_MIN_CHF = 1000;
