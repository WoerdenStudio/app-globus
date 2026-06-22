import { z } from 'zod';
import {
  accessTypeSchema,
  INSURANCE_THRESHOLD_CHF,
  PICKUP_OTHER_VALUE,
} from '../types/enums';
import type { OperatingHoursSettings } from '../types';
import { isSunday } from '../business/operatingHours';
import { isValidTimeSlot } from '../business/timeSlots';
import { isWithinCutoff } from '../business/cutoff';
import type { CutoffSettings } from '../types';

/** Schéma de base pour une commande (formulaire) */
export const orderFormSchema = z
  .object({
    // Départ
    pickup_location_id: z.string().min(1, 'order.validation.pickupRequired'),
    pickup_address_custom: z.string().optional(),

    // Destination
    delivery_address: z.string().min(1, 'order.validation.deliveryRequired'),
    access_type: accessTypeSchema,
    access_detail: z.string().optional(),
    is_hotel: z.boolean().default(false),
    hotel_room_number: z.string().optional(),

    // Optionnel — destinataire & logistique
    floor: z.string().optional(),
    client_name: z.string().optional(),
    client_phone: z.string().optional(),
    requested_date: z.string().optional(),
    requested_time_slot: z.string().optional(),
    weight: z.coerce.number().positive().optional().or(z.literal('')),
    dimensions: z.string().optional(),

    // Optionnel — caractéristiques
    leave_at_door: z.boolean().default(false),
    fragile: z.boolean().default(false),
    perishable: z.boolean().default(false),
    goods_photo_url: z.string().optional(),
    declared_value_chf: z.coerce.number().nonnegative().optional().or(z.literal('')),
    extra_insurance: z.boolean().default(false),
    special_instructions: z.string().optional(),

    // Tarif (peut être ajusté manuellement)
    price_chf: z.coerce.number().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    // Lieu « Autres » → adresse de départ obligatoire
    if (data.pickup_location_id === PICKUP_OTHER_VALUE) {
      if (!data.pickup_address_custom?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'order.validation.customPickupRequired',
          path: ['pickup_address_custom'],
        });
      }
    }

    // Détail d'accès obligatoire sauf accès libre
    if (data.access_type !== 'acces_libre' && !data.access_detail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'order.validation.accessDetailRequired',
        path: ['access_detail'],
      });
    }

    // Hôtel → numéro de chambre obligatoire
    if (data.is_hotel && !data.hotel_room_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'order.validation.hotelRoomRequired',
        path: ['hotel_room_number'],
      });
    }

    // Assurance complémentaire recommandée si valeur > seuil
    const declaredValue =
      typeof data.declared_value_chf === 'number' ? data.declared_value_chf : null;
    if (declaredValue != null && declaredValue > INSURANCE_THRESHOLD_CHF && !data.extra_insurance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'order.validation.extraInsuranceRecommended',
        path: ['extra_insurance'],
      });
    }
  });

export type OrderFormData = z.infer<typeof orderFormSchema>;

/** Contexte de validation pour date/créneau */
export interface OrderValidationContext {
  operatingHours: OperatingHoursSettings;
  cutoffs: CutoffSettings;
  now?: Date;
}

/** Schéma complet avec validation date/créneau */
export function createOrderFormSchemaWithContext(ctx: OrderValidationContext) {
  return orderFormSchema.superRefine((data, zodCtx) => {
    if (data.requested_date) {
      const date = new Date(data.requested_date + 'T12:00:00');

      if (isSunday(date)) {
        zodCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'order.validation.sundayClosed',
          path: ['requested_date'],
        });
      }

      const now = ctx.now ?? new Date();
      if (!isWithinCutoff(now, date, ctx.cutoffs)) {
        zodCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'order.validation.cutoffExceeded',
          path: ['requested_date'],
        });
      }

      if (data.requested_time_slot) {
        if (!isValidTimeSlot(date, data.requested_time_slot, ctx.operatingHours)) {
          zodCtx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'order.validation.invalidTimeSlot',
            path: ['requested_time_slot'],
          });
        }
      }
    }
  });
}

/** Schéma pour la création en base */
export const orderInsertSchema = z.object({
  pickup_location_id: z.string().uuid().nullable(),
  pickup_address_custom: z.string().nullable(),
  delivery_address: z.string().min(1),
  access_type: accessTypeSchema,
  access_detail: z.string().nullable(),
  is_hotel: z.boolean(),
  hotel_room_number: z.string().nullable(),
  floor: z.string().nullable(),
  client_name: z.string().nullable(),
  client_phone: z.string().nullable(),
  requested_date: z.string().nullable(),
  requested_time_slot: z.string().nullable(),
  weight: z.number().nullable(),
  dimensions: z.string().nullable(),
  leave_at_door: z.boolean(),
  fragile: z.boolean(),
  perishable: z.boolean(),
  goods_photo_url: z.string().nullable(),
  declared_value_chf: z.number().nullable(),
  extra_insurance: z.boolean(),
  special_instructions: z.string().nullable(),
  price_chf: z.number().nullable(),
  created_by: z.string().uuid(),
});

export type OrderInsertData = z.infer<typeof orderInsertSchema>;
