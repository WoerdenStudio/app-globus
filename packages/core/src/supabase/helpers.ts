import type { TypedSupabaseClient } from './client';
import type {
  AppSettings,
  Profile,
  PickupLocation,
  PricingRule,
  DeliveryOptionConfig,
} from '../types';
import { DEFAULT_CUTOFFS, DEFAULT_OPERATING_HOURS } from '../business/operatingHours';

const SETTINGS_KEY = 'app_settings';

/** Récupère le profil de l'utilisateur connecté */
export async function getProfile(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

/** Vérifie si l'utilisateur est admin */
export async function isAdmin(client: TypedSupabaseClient, userId: string): Promise<boolean> {
  const profile = await getProfile(client, userId);
  return profile?.role === 'admin' && profile.active;
}

/** Récupère les paramètres applicatifs (horaires, cutoffs, email Globus) */
export async function getAppSettings(client: TypedSupabaseClient): Promise<AppSettings> {
  const { data } = await client.from('settings').select('value').eq('key', SETTINGS_KEY).single();

  if (data?.value) {
    return data.value as AppSettings;
  }

  return {
    operating_hours: DEFAULT_OPERATING_HOURS,
    cutoffs: DEFAULT_CUTOFFS,
    globus_notification_email: 'livraison@globus.ch',
  };
}

/** Récupère les lieux de départ actifs */
export async function getActivePickupLocations(
  client: TypedSupabaseClient,
): Promise<PickupLocation[]> {
  const { data, error } = await client
    .from('pickup_locations')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PickupLocation[];
}

/** Récupère la règle tarifaire active */
export async function getActivePricingRule(
  client: TypedSupabaseClient,
): Promise<PricingRule | null> {
  const { data, error } = await client
    .from('pricing_rules')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as PricingRule;
}

/** Récupère les options de livraison activées */
export async function getEnabledDeliveryOptions(
  client: TypedSupabaseClient,
): Promise<DeliveryOptionConfig[]> {
  const { data, error } = await client
    .from('delivery_options_config')
    .select('*')
    .eq('enabled', true);

  if (error) throw error;
  return (data ?? []) as DeliveryOptionConfig[];
}
