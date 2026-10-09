import { parseSwissAddress } from './swissAddress';
import { totalBilledWeightKg } from './packageFormats';
import { insurancePremiumChf } from './pricing';

/**
 * Grille 2026 de La Vélopostale, feuille « BASE » du fichier Excel.
 * Prix standard pour un colis de moins de 5 kg.
 * Au-dessus, on ajoute un supplément selon la tranche de poids
 * (feuille « Interne ») : +18 de 5 à 20 kg, +30 de 20 à 30 kg, +35 de 30 à 40 kg.
 * Le prix « panique » n'est pas utilisé.
 */
export interface TariffZone {
  zip: string;
  city: string;
  standardChf: number;
}

export const TARIFF_ZONES: TariffZone[] = [
  { zip: '1201', city: 'Genève', standardChf: 18 },
  { zip: '1202', city: 'Genève', standardChf: 18 },
  { zip: '1203', city: 'Genève', standardChf: 18 },
  { zip: '1204', city: 'Genève', standardChf: 18 },
  { zip: '1205', city: 'Genève', standardChf: 18 },
  { zip: '1206', city: 'Genève', standardChf: 18 },
  { zip: '1207', city: 'Genève', standardChf: 18 },
  { zip: '1208', city: 'Genève', standardChf: 18 },
  { zip: '1209', city: 'Genève', standardChf: 18 },
  { zip: '1212', city: 'Grand-Lancy', standardChf: 26 },
  { zip: '1213', city: 'Petit-Lancy', standardChf: 26 },
  { zip: '1213', city: 'Onex', standardChf: 33 },
  { zip: '1214', city: 'Vernier', standardChf: 30 },
  { zip: '1215', city: 'GE-Aeroport', standardChf: 30 },
  { zip: '1216', city: 'Cointrin', standardChf: 26 },
  { zip: '1217', city: 'Meyrin', standardChf: 38 },
  { zip: '1218', city: 'Grand-Saconnex', standardChf: 30 },
  { zip: '1219', city: 'Le Lignon', standardChf: 26 },
  { zip: '1219', city: 'Châtelaine', standardChf: 26 },
  { zip: '1220', city: 'Avanchets', standardChf: 26 },
  { zip: '1222', city: 'Vesenaz', standardChf: 45 },
  { zip: '1223', city: 'Cologny', standardChf: 38 },
  { zip: '1224', city: 'Chêne-Bougeries', standardChf: 26 },
  { zip: '1225', city: 'Chêne-Bourg', standardChf: 26 },
  { zip: '1226', city: 'Thonex', standardChf: 33 },
  { zip: '1227', city: 'Carouge', standardChf: 18 },
  { zip: '1228', city: 'Plan-les-Ouates', standardChf: 33 },
  { zip: '1231', city: 'Conches', standardChf: 26 },
  { zip: '1232', city: 'Confignon', standardChf: 43 },
  { zip: '1233', city: 'Bernex', standardChf: 43 },
  { zip: '1234', city: 'Vessy', standardChf: 26 },
  { zip: '1236', city: 'Cartigny', standardChf: 68 },
  { zip: '1237', city: 'Avully', standardChf: 73 },
  { zip: '1239', city: 'Collex', standardChf: 48 },
  { zip: '1241', city: 'Puplinge', standardChf: 43 },
  { zip: '1242', city: 'Satigny', standardChf: 53 },
  { zip: '1243', city: 'Presinge', standardChf: 53 },
  { zip: '1244', city: 'Choulex', standardChf: 43 },
  { zip: '1245', city: 'Collonge-Bellerive', standardChf: 48 },
  { zip: '1246', city: 'Corsier', standardChf: 58 },
  { zip: '1247', city: 'Anières', standardChf: 63 },
  { zip: '1248', city: 'Hermance', standardChf: 78 },
  { zip: '1251', city: 'Gy', standardChf: 63 },
  { zip: '1252', city: 'Meinier', standardChf: 53 },
  { zip: '1253', city: 'Vandoeuvres', standardChf: 38 },
  { zip: '1254', city: 'Jussy', standardChf: 68 },
  { zip: '1255', city: 'Veyrier', standardChf: 33 },
  { zip: '1256', city: 'Troinex', standardChf: 33 },
  { zip: '1257', city: 'Croix-De-Rozon', standardChf: 43 },
  { zip: '1258', city: 'Perly', standardChf: 43 },
  { zip: '1281', city: 'Russin', standardChf: 68 },
  { zip: '1282', city: 'Dardagny', standardChf: 83 },
  { zip: '1283', city: 'La Plaine', standardChf: 83 },
  { zip: '1284', city: 'Chancy', standardChf: 83 },
  { zip: '1285', city: 'Athenaz-Avusy', standardChf: 83 },
  { zip: '1286', city: 'Soral', standardChf: 83 },
  { zip: '1287', city: 'Laconnex', standardChf: 68 },
  { zip: '1288', city: 'Aire-La-Ville', standardChf: 53 },
  { zip: '1290', city: 'Versoix', standardChf: 48 },
  { zip: '1292', city: 'Chambésy', standardChf: 28 },
  { zip: '1293', city: 'Bellevue', standardChf: 38 },
  { zip: '1294', city: 'Genthod', standardChf: 43 },
];

/** Enlève les accents pour comparer « Genève » et « Geneve ». */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Prix standard (< 5 kg) pour un code postal, ou null si la ville n'est pas dans la grille. */
export function standardPriceChf(zip: string | undefined, city: string | undefined): number | null {
  if (!zip) return null;
  const matches = TARIFF_ZONES.filter((zone) => zone.zip === zip);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!.standardChf;

  const prices = new Set(matches.map((zone) => zone.standardChf));
  if (prices.size === 1) return matches[0]!.standardChf;

  const wanted = city ? normalizeName(city) : '';
  if (!wanted) return null;
  const hit = matches.find((zone) => {
    const name = normalizeName(zone.city);
    return wanted === name || wanted.includes(name) || name.includes(wanted);
  });
  return hit?.standardChf ?? null;
}

/**
 * Supplément de poids à ajouter au prix standard.
 * null = la grille s'arrête à 40 kg, on ne invente pas de prix.
 */
export function weightSupplementChf(billedKg: number): number | null {
  if (billedKg < 5) return 0;
  if (billedKg <= 20) return 18;
  if (billedKg <= 30) return 30;
  if (billedKg <= 40) return 35;
  return null;
}

export interface PricedPackage {
  weight?: number | null;
  dimensions?: string | null;
}

/**
 * Prix d'une course : code postal + poids total retenu
 * (le plus élevé entre le poids réel et le poids IATA, pour chaque colis, puis addition)
 * + assurance si un montant est déclaré pour la commande complète.
 * null si l'adresse n'est pas dans la grille, ou si le poids dépasse 40 kg.
 */
export function quoteDeliveryPrice(
  deliveryAddress: string | null | undefined,
  packages: PricedPackage[],
  declaredValueChf?: number | null | '',
): number | null {
  const billedKg = totalBilledWeightKg(packages);
  if (billedKg <= 0) return null;

  const parsed = parseSwissAddress(deliveryAddress ?? '');
  const base = standardPriceChf(parsed.zip, parsed.city);
  if (base == null) return null;

  const extra = weightSupplementChf(billedKg);
  if (extra == null) return null;
  return base + extra + insurancePremiumChf(declaredValueChf);
}

/** True si l'adresse a un NPA, mais qu'il n'est pas dans la grille Vélopostale. */
export function isOutOfTariffZone(deliveryAddress: string | null | undefined): boolean {
  const parsed = parseSwissAddress(deliveryAddress ?? '');
  if (!parsed.zip) return false;
  return standardPriceChf(parsed.zip, parsed.city) == null;
}
