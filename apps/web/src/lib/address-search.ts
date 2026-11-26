import { parseSwissAddress } from '@globus/core/business';

export interface AddressSuggestion {
  id: string;
  label: string;
  street?: string;
  city?: string;
  postcode?: string;
}

interface NominatimResult {
  display_name: string;
  address?: Record<string, string>;
}

/** Formate une suggestion Nominatim en adresse lisible */
export function formatNominatimResult(item: NominatimResult): AddressSuggestion {
  const addr = item.address ?? {};
  const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '';
  const postcode = addr.postcode ?? '';

  const parts = [street, [postcode, city].filter(Boolean).join(' ')].filter(Boolean);

  return {
    id: item.display_name,
    label: parts.length > 0 ? parts.join(', ') : item.display_name,
    street: street || undefined,
    city: city || undefined,
    postcode: postcode || undefined,
  };
}

/**
 * Recherche d'adresses en Suisse via Nominatim (OpenStreetMap).
 * Renvoie null si le service ne répond pas (panne, réseau…).
 */
async function searchNominatim(query: string, limit: number): Promise<NominatimResult[] | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    countrycodes: 'ch',
    limit: String(limit),
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'Globus-Livraison/1.0 (contact@globus.ch)',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return (await response.json()) as NominatimResult[];
  } catch {
    return null;
  }
}

/** Suggestions affichées sous le champ « Adresse de livraison » */
export async function searchSwissAddresses(query: string): Promise<AddressSuggestion[]> {
  const results = await searchNominatim(query, 6);
  const suggestions = (results ?? []).map(formatNominatimResult);

  // La carte peut contenir plusieurs objets à la même adresse (bâtiment, entrée…) :
  // on ne garde qu'une ligne par adresse
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = normalize(suggestion.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Met en minuscules, sans accents ni espaces superflus, pour comparer deux textes */
function normalize(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vérifie que l'adresse de livraison existe : on la recherche sur la carte et
 * on exige un résultat avec la même rue, le même numéro et le même code postal.
 * - 'valid' : adresse trouvée
 * - 'invalid' : le service répond, mais l'adresse n'existe pas
 * - 'unavailable' : le service ne répond pas (on ne bloque pas la commande)
 */
export async function verifySwissAddress(
  address: string,
): Promise<'valid' | 'invalid' | 'unavailable'> {
  const results = await searchNominatim(address, 5);
  if (results == null) return 'unavailable';

  const wanted = parseSwissAddress(address);
  const wantedNumber = normalize(`${wanted.streetNumber ?? ''}${wanted.streetNumberSuffix ?? ''}`);

  const found = results.some((result) => {
    const addr = result.address ?? {};
    return (
      normalize(addr.road) === normalize(wanted.street) &&
      normalize(addr.house_number).replace(/\s/g, '') === wantedNumber &&
      normalize(addr.postcode) === normalize(wanted.zip)
    );
  });

  return found ? 'valid' : 'invalid';
}
