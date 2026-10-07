import { parseDimensionsCm } from './swissAddress';

/**
 * Formats de colis proposés dans le formulaire.
 * Le poids IATA n'est pas saisi : il se calcule avec la taille.
 * Formule courante : longueur × largeur × hauteur (cm) ÷ 6 000 = kg.
 */
export const IATA_DIVISOR = 6000;

export interface PackageFormat {
  /** Identifiant stable, enregistré avec la commande */
  id: string;
  label: string;
  /** Centimètres. Vide pour « Autre » : l'employé saisit tout à la main. */
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  /**
   * Poids réel estimé, prérempli dans le champ modifiable.
   * L'employé peut le changer. Le prix utilise le plus élevé
   * entre ce poids et le poids IATA.
   */
  estimatedActualKg: number | null;
  /** Coche automatiquement « produits frais / périssables » */
  perishable: boolean;
}

export const PACKAGE_FORMATS: PackageFormat[] = [
  { id: 'carton-s', label: 'Carton S', lengthCm: 20, widthCm: 6, heightCm: 21, estimatedActualKg: 1, perishable: false },
  { id: 'carton-m', label: 'Carton M', lengthCm: 34, widthCm: 10, heightCm: 30, estimatedActualKg: 2.5, perishable: false },
  { id: 'carton-l', label: 'Carton L', lengthCm: 54, widthCm: 12, heightCm: 48, estimatedActualKg: 4, perishable: false },
  { id: 'cadeau-hl', label: 'Cadeau H&L', lengthCm: 45, widthCm: 23, heightCm: 43, estimatedActualKg: 5, perishable: false },
  { id: 'delicatessa-s', label: 'Délicatessa S', lengthCm: 26, widthCm: 12, heightCm: 32, estimatedActualKg: 1.5, perishable: false },
  { id: 'delicatessa-m', label: 'Délicatessa M', lengthCm: 32, widthCm: 16, heightCm: 38, estimatedActualKg: 3, perishable: false },
  { id: 'delicatessa-l', label: 'Délicatessa L', lengthCm: 39, widthCm: 16, heightCm: 32, estimatedActualKg: 4, perishable: false },
  { id: 'gateau-s', label: 'Gâteau S', lengthCm: 32, widthCm: 22, heightCm: 26, estimatedActualKg: 2, perishable: false },
  { id: 'gateau-l', label: 'Gâteau L', lengthCm: 41, widthCm: 41, heightCm: 41, estimatedActualKg: 5, perishable: false },
  { id: 'bouteille-1', label: '1 bouteille', lengthCm: 16, widthCm: 8, heightCm: 39, estimatedActualKg: 1.5, perishable: false },
  { id: 'bouteille-2', label: '2 bouteilles', lengthCm: 16, widthCm: 15, heightCm: 26, estimatedActualKg: 3, perishable: false },
  { id: 'carton-6-vins', label: 'Carton 6 vins', lengthCm: 25, widthCm: 17, heightCm: 33, estimatedActualKg: 9, perishable: false },
  { id: 'isotherme-s', label: 'Isotherme S', lengthCm: 22, widthCm: 11, heightCm: 33, estimatedActualKg: 2, perishable: true },
  { id: 'isotherme-l', label: 'Isotherme L', lengthCm: 35, widthCm: 18, heightCm: 40, estimatedActualKg: 5, perishable: true },
  { id: 'autre', label: 'Autre', lengthCm: null, widthCm: null, heightCm: null, estimatedActualKg: null, perishable: false },
];

export function findPackageFormat(id: string | null | undefined): PackageFormat | undefined {
  if (!id) return undefined;
  return PACKAGE_FORMATS.find((format) => format.id === id);
}

/** Chaîne enregistrée dans le champ dimensions, ex. "20×6×21 cm". */
export function formatDimensionsCm(
  lengthCm: number | null,
  widthCm: number | null,
  heightCm: number | null,
): string {
  if (lengthCm == null || widthCm == null || heightCm == null) return '';
  return `${lengthCm}×${widthCm}×${heightCm} cm`;
}

/** Poids IATA en kg, arrondi au gramme. 0 si la taille n'est pas complète. */
export function iataWeightKg(dimensions: string | null | undefined): number {
  const dims = parseDimensionsCm(dimensions);
  if (dims.length_cm == null || dims.width_cm == null || dims.height_cm == null) return 0;
  const raw = (dims.length_cm * dims.width_cm * dims.height_cm) / IATA_DIVISOR;
  return Math.round(raw * 1000) / 1000;
}

/**
 * Poids qui compte pour le tarif : le plus élevé entre le poids réel
 * saisi par l'employé et le poids IATA calculé avec la taille.
 */
export function billedWeightKg(
  actualKg: number | null | undefined,
  dimensions: string | null | undefined,
): number {
  const actual = typeof actualKg === 'number' && Number.isFinite(actualKg) ? actualKg : 0;
  const iata = iataWeightKg(dimensions);
  return Math.round(Math.max(actual, iata) * 1000) / 1000;
}

export function totalBilledWeightKg(
  packages: { weight?: number | null; dimensions?: string | null }[],
): number {
  const total = packages.reduce((sum, pkg) => sum + billedWeightKg(pkg.weight, pkg.dimensions), 0);
  return Math.round(total * 1000) / 1000;
}

/** Résumé d'un colis pour l'écran, l'e-mail et l'envoi vers Polypheme. */
export function summarizePackage(pkg: {
  package_type?: string | null;
  weight?: number | null;
  dimensions?: string | null;
}): {
  formatLabel: string | null;
  actualKg: number;
  iataKg: number;
  billedKg: number;
} {
  const format = findPackageFormat(pkg.package_type);
  const actualKg =
    typeof pkg.weight === 'number' && Number.isFinite(pkg.weight) ? pkg.weight : 0;
  return {
    formatLabel: format?.label ?? null,
    actualKg,
    iataKg: iataWeightKg(pkg.dimensions),
    billedKg: billedWeightKg(pkg.weight, pkg.dimensions),
  };
}

export function formatKgLabel(value: number): string {
  return `${value.toLocaleString('fr-CH', { maximumFractionDigits: 3 })} kg`;
}
