import { z } from 'zod';

const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean().optional(),
});

export const operatingHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

export const cutoffSettingsSchema = z.object({
  weekday: z.string().regex(/^\d{2}:\d{2}$/),
  saturday: z.string().regex(/^\d{2}:\d{2}$/),
});

export const appSettingsSchema = z.object({
  operating_hours: operatingHoursSchema,
  cutoffs: cutoffSettingsSchema,
  globus_notification_email: z.string().email(),
});

export const pricingRuleSchema = z.object({
  label: z.string().min(1),
  base_price_chf: z.coerce.number().nonnegative(),
  modifiers: z.record(z.number()).default({}),
  active: z.boolean().default(true),
});

export const pickupLocationSchema = z.object({
  label: z.string().min(1),
  active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export const deliveryOptionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  enabled: z.boolean().default(true),
});

export type OperatingHoursInput = z.infer<typeof operatingHoursSchema>;
export type CutoffSettingsInput = z.infer<typeof cutoffSettingsSchema>;
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
export type PricingRuleInput = z.infer<typeof pricingRuleSchema>;
export type PickupLocationInput = z.infer<typeof pickupLocationSchema>;
export type DeliveryOptionInput = z.infer<typeof deliveryOptionSchema>;
