import type { Order, PackageItem } from '../types';
import { parseDimensionsCm, parseSwissAddress, type ParsedSwissAddress } from '../business/swissAddress';
import { parseTimeSlotEndMinutes } from '../business/orderStatus';

/** Contexte nécessaire pour envoyer une commande à Logtech */
export interface LogtechOrderContext {
  /** Adresse texte du lieu de ramassage (label Globus ou adresse libre) */
  pickupAddress: string;
  /** Nom du collaborateur qui passe la commande (optionnel) */
  orderedBy?: string | null;
}

/** Réponse de création Logtech */
export interface LogtechOrderResponse {
  logtechRef: string;
  status: string;
}

export interface LogtechClient {
  createOrder(order: Order, context: LogtechOrderContext): Promise<LogtechOrderResponse>;
  getOrderStatus(logtechRef: string): Promise<string>;
  cancelOrder(logtechRef: string): Promise<void>;
}

export interface LogtechClientConfig {
  baseUrl: string;
  apiKey: string;
}

/** Note Logtech (instructions pour le coursier, dispatch, etc.) */
interface LogtechNote {
  note: string;
  audience: Array<'contact_person' | 'courier' | 'dispatcher' | 'customer' | 'clearing'>;
}

interface LogtechAddressPayload {
  person?: string;
  company?: string;
  street: string;
  streetNumber?: string;
  streetNumberSuffix?: string;
  zip?: string;
  city?: string;
  country?: string;
}

interface LogtechStopPayload {
  address: LogtechAddressPayload;
  contactPhone?: string;
  contactPerson?: string;
  description?: string;
  dateTimeFrom?: string;
  dateTimeTo?: string;
  notes?: LogtechNote[];
}

interface LogtechShipmentPayload {
  count?: number;
  // Noms de champs officiels de l'API Logtech (schéma OpenAPI /api/v2/order).
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  weight_kg?: number;
  description?: string;
}

interface LogtechBillingRecord {
  invoiceReference?: string;
  invoiceAmountWithoutVat?: number;
  invoiceCurrency?: string;
  personWhoOrdered?: string;
}

/** Prix de base facturé pour chaque commande, envoyé à Logtech (en CHF, hors TVA). */
export const LOGTECH_BASE_PRICE_CHF = 50;

/** Devise utilisée pour le montant envoyé à Logtech. */
export const LOGTECH_CURRENCY = 'CHF';

function toLogtechAddress(parsed: ParsedSwissAddress, extras?: { person?: string; company?: string }): LogtechAddressPayload {
  return {
    person: extras?.person,
    company: extras?.company,
    street: parsed.street,
    streetNumber: parsed.streetNumber,
    streetNumberSuffix: parsed.streetNumberSuffix,
    zip: parsed.zip,
    city: parsed.city,
    country: parsed.country,
  };
}

/** Extrait l'heure de début d'un créneau (ex: "17:00-19:00") */
function parseTimeSlotStartMinutes(slot: string): number | null {
  const standardMatch = slot.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
  if (standardMatch?.[1]) {
    const [hoursStr, minutesStr] = standardMatch[1].split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return hours * 60 + minutes;
    }
  }
  return null;
}

const TIMEZONE = 'Europe/Zurich';

/** Décalage (en minutes) du fuseau pour un instant UTC donné */
function timeZoneOffsetMinutes(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string): number => {
    const value = parts.find((p) => p.type === type)?.value;
    return value ? Number(value) : 0;
  };
  // '24' peut apparaître pour minuit selon l'environnement
  const rawHour = get('hour');
  const hour = rawHour === 24 ? 0 : rawHour;
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return (asUtc - instant.getTime()) / 60000;
}

/**
 * Décalage horaire suisse (+02:00 en été, +01:00 en hiver) pour une heure locale
 * donnée. On itère une fois pour gérer correctement les changements d'heure.
 */
function swissOffsetString(year: number, month: number, day: number, hours: number, minutes: number): string {
  const wallAsUtc = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const firstGuess = timeZoneOffsetMinutes(TIMEZONE, new Date(wallAsUtc));
  const actualInstant = wallAsUtc - firstGuess * 60000;
  const offsetMinutes = timeZoneOffsetMinutes(TIMEZONE, new Date(actualInstant));

  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function buildIsoDateTime(date: string, minutesFromMidnight: number): string {
  const [yearStr, monthStr, dayStr] = date.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const offset = swissOffsetString(year, month, day, hours, minutes);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${offset}`;
}

/**
 * Notes affichées dans la zone « NOTES » au niveau de la commande (tout en bas
 * de la fiche Logtech). On y met les informations de date/créneau.
 * On cible toutes les audiences pour maximiser la visibilité.
 */
function buildOrderLevelNotes(order: Order): LogtechNote[] {
  const notes: LogtechNote[] = [];
  const audience: LogtechNote['audience'] = [
    'contact_person',
    'courier',
    'dispatcher',
    'customer',
    'clearing',
  ];

  if (order.time_slot_notes?.trim()) {
    notes.push({
      note: `Infos date/créneau : ${order.time_slot_notes.trim()}`,
      audience,
    });
  }

  return notes;
}

/**
 * Contenu du champ « Description » de l'étape de livraison Logtech.
 * L'API v2 n'a pas de champ « description » : dans l'écran Logtech, ce champ est
 * alimenté par `contactPerson`. On y regroupe donc, à la demande d'Andrin, les
 * instructions destinataire, l'étage et le code / détail d'accès.
 * Le nom du destinataire n'y figure plus (il reste dans l'adresse).
 */
function buildDeliveryContactDescription(order: Order): string | undefined {
  const parts: string[] = [];

  if (order.special_instructions?.trim()) {
    parts.push(`Instructions : ${order.special_instructions.trim()}`);
  }

  if (order.floor?.trim()) {
    parts.push(`Étage : ${order.floor.trim()}`);
  }

  if (order.access_detail?.trim()) {
    parts.push(`Accès (${order.access_type}) : ${order.access_detail.trim()}`);
  }

  return parts.length > 0 ? parts.join(' — ') : undefined;
}

/**
 * Notes de l'étape de livraison. Les instructions, l'étage et les infos de
 * date/créneau ont été déplacés dans le champ « Description » (contactPerson) :
 * on ne garde ici que l'hôtel et l'autorisation de dépôt devant la porte.
 */
function buildOrderNotes(order: Order): LogtechNote[] {
  const notes: LogtechNote[] = [];
  const audience: LogtechNote['audience'] = ['courier', 'dispatcher'];

  if (order.is_hotel && order.hotel_name) {
    const room = order.hotel_room_number ? `, ch. ${order.hotel_room_number}` : '';
    notes.push({ note: `Hôtel : ${order.hotel_name}${room}`, audience });
  }

  if (order.leave_at_door) {
    notes.push({ note: 'Autorisation de déposer devant la porte', audience });
  }

  return notes;
}

function packageToShipment(pkg: PackageItem): LogtechShipmentPayload {
  const dims = parseDimensionsCm(pkg.dimensions);
  const hasWeight = typeof pkg.weight === 'number' && Number.isFinite(pkg.weight);
  const descriptionParts = [
    pkg.description?.trim(),
    pkg.bag_number ? `Sac ${pkg.bag_number}` : null,
    // Poids réel dans le texte : Logtech affiche le poids facturable (volumétrique)
    // dans la colonne dédiée, donc on rend le poids déclaré visible ici aussi.
    hasWeight ? `${pkg.weight} kg réels` : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const shipment: LogtechShipmentPayload = {
    count: 1,
    description: descriptionParts || 'Colis Globus',
  };

  // Poids réel de la commande (champ officiel weight_kg).
  if (hasWeight) {
    shipment.weight_kg = pkg.weight;
  }

  // Dimensions (champs officiels length_cm / width_cm / height_cm).
  if (dims.length_cm !== undefined) {
    shipment.length_cm = dims.length_cm;
  }
  if (dims.width_cm !== undefined) {
    shipment.width_cm = dims.width_cm;
  }
  if (dims.height_cm !== undefined) {
    shipment.height_cm = dims.height_cm;
  }

  return shipment;
}

/** Adresse client Globus (facturation) envoyée à Logtech — requise en production */
function buildCustomerAddress(): LogtechAddressPayload {
  const raw =
    readEnv('LOGTECH_CUSTOMER_ADDRESS') || 'Rue du Rhône 48, 1204 Genève';
  const company = readEnv('LOGTECH_CUSTOMER_COMPANY') || 'Globus Genève';
  return toLogtechAddress(parseSwissAddress(raw), { company });
}

/** Transforme une commande du portail au format JSON Logtech */
export function mapOrderToLogtechPayload(order: Order, context: LogtechOrderContext) {
  const deliveryParsed = parseSwissAddress(order.delivery_address);
  const pickupParsed = parseSwissAddress(context.pickupAddress);

  const deliveryStop: LogtechStopPayload = {
    // Le nom du destinataire reste uniquement dans l'adresse (champ person).
    address: toLogtechAddress(deliveryParsed, {
      person: order.client_name ?? undefined,
      company: order.is_hotel ? order.hotel_name ?? undefined : undefined,
    }),
    // On garde le téléphone. Le champ « Description » de l'écran Logtech est
    // alimenté par contactPerson : on y met instructions + étage + infos créneau
    // (plus le nom du destinataire, qui reste dans l'adresse).
    contactPhone: order.client_phone ?? undefined,
    contactPerson: buildDeliveryContactDescription(order),
    notes: buildOrderNotes(order),
  };

  // Le lieu de départ est déjà dans l'adresse de l'étape de ramassage :
  // on ne le duplique plus dans les notes.
  const pickupStop: LogtechStopPayload = {
    address: toLogtechAddress(pickupParsed, { company: 'Globus Genève' }),
  };

  // Par défaut, la date de référence est le moment de l'envoi ; elle est
  // remplacée par la date de livraison souhaitée si elle est connue.
  let referenceTime = new Date().toISOString();

  if (order.requested_date && order.requested_time_slot) {
    const startMinutes = parseTimeSlotStartMinutes(order.requested_time_slot);
    const endMinutes = parseTimeSlotEndMinutes(order.requested_time_slot);
    const fromIso =
      startMinutes !== null ? buildIsoDateTime(order.requested_date, startMinutes) : null;
    const toIso = endMinutes !== null ? buildIsoDateTime(order.requested_date, endMinutes) : null;

    // Même date + même créneau pour le ramassage et la livraison, afin que
    // Logtech n'affiche plus la date de création sur l'étape de ramassage.
    if (fromIso) {
      deliveryStop.dateTimeFrom = fromIso;
      pickupStop.dateTimeFrom = fromIso;
      // La date de référence de la commande suit la date de livraison souhaitée.
      referenceTime = fromIso;
    }
    if (toIso) {
      deliveryStop.dateTimeTo = toIso;
      pickupStop.dateTimeTo = toIso;
    }
  }
  
  const packages = order.packages?.length ? order.packages : [];
  const shipments = packages.length > 0 ? packages.map(packageToShipment) : [{ count: 1, description: 'Colis Globus', weight_kg: 1 }];

  // Notes globales de la commande (zone « NOTES » en bas de la fiche Logtech)
  const orderNotes = buildOrderLevelNotes(order);

  // Facturation : prix de base fixe (50 CHF hors TVA) + donneur d'ordre.
  // ⚠️ La clé API doit avoir la permission « set order prices » côté Logtech,
  // sinon invoiceAmountWithoutVat est ignoré.
  const billingRecord: LogtechBillingRecord = {
    invoiceAmountWithoutVat: LOGTECH_BASE_PRICE_CHF,
    invoiceCurrency: LOGTECH_CURRENCY,
  };
  if (context.orderedBy) {
    billingRecord.personWhoOrdered = context.orderedBy;
  }

  return {
    order: {
      referenceTime,
      customer: {
        address: buildCustomerAddress(),
      },
      // Référence de la commande à un seul endroit (bon de transport) pour éviter
      // qu'elle apparaisse en double/triple chez le dispatcher.
      waybill: {
        identifier: order.id,
      },
      billingRecord,
      stops: [pickupStop, deliveryStop],
      shipments,
      // Le code / détail d'accès apparaît ici, au niveau de la commande,
      // et non plus uniquement sur l'arrêt de livraison.
      ...(orderNotes.length > 0 ? { notes: orderNotes } : {}),
    },
  };
}

export class HttpLogtechClient implements LogtechClient {
  constructor(private readonly config: LogtechClientConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.config.apiKey,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Logtech API ${response.status}: ${body || response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async createOrder(order: Order, context: LogtechOrderContext): Promise<LogtechOrderResponse> {
    const payload = mapOrderToLogtechPayload(order, context);
    const result = await this.request<{ uuid: string }>('/api/v2/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      logtechRef: result.uuid,
      status: 'created',
    };
  }

  async getOrderStatus(logtechRef: string): Promise<string> {
    const result = await this.request<{ acceptedAt: string | null }>(
      `/api/v2/order/${logtechRef}/acceptance-status`,
    );
    return result.acceptedAt ? 'accepted' : 'pending';
  }

  async cancelOrder(logtechRef: string): Promise<void> {
    await this.request(`/api/v2/order/${logtechRef}`, { method: 'DELETE' });
  }
}

export class StubLogtechClient implements LogtechClient {
  async createOrder(order: Order, _context: LogtechOrderContext): Promise<LogtechOrderResponse> {
    console.warn('[LogtechClient] Stub: createOrder — LOGTECH_API_KEY non configurée');
    return {
      logtechRef: `STUB-${order.id}`,
      status: 'pending',
    };
  }

  async getOrderStatus(logtechRef: string): Promise<string> {
    console.warn('[LogtechClient] Stub: getOrderStatus');
    return `stub-status-${logtechRef}`;
  }

  async cancelOrder(logtechRef: string): Promise<void> {
    console.warn('[LogtechClient] Stub: cancelOrder', logtechRef);
  }
}

function readEnv(name: string): string | undefined {
  const value = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
  return typeof value === 'string' ? value.trim() : undefined;
}

/** Crée un client Logtech (réel si clé présente, sinon stub) */
export function createLogtechClient(config?: Partial<LogtechClientConfig>): LogtechClient {
  const apiKey = config?.apiKey?.trim() || readEnv('LOGTECH_API_KEY');
  const baseUrl =
    config?.baseUrl?.trim() || readEnv('LOGTECH_API_URL') || 'https://api.logtech.ch';

  return apiKey ? new HttpLogtechClient({ baseUrl, apiKey }) : new StubLogtechClient();
}

let cachedClient: LogtechClient | null = null;

/** Retourne un client Logtech mis en cache (préférer createLogtechClient avec config explicite côté Next.js) */
export function getLogtechClient(config?: Partial<LogtechClientConfig>): LogtechClient {
  if (config) {
    return createLogtechClient(config);
  }

  if (cachedClient) return cachedClient;
  cachedClient = createLogtechClient();
  return cachedClient;
}

/** @deprecated Préférer getLogtechClient() — conservé pour compatibilité */
export const logtechClient: LogtechClient = {
  createOrder: (order, context) => getLogtechClient().createOrder(order, context),
  getOrderStatus: (ref) => getLogtechClient().getOrderStatus(ref),
  cancelOrder: (ref) => getLogtechClient().cancelOrder(ref),
};
