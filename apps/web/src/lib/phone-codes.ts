export interface PhoneCode {
  /** Code pays ISO, unique dans la liste (plusieurs pays peuvent partager le même indicatif). */
  id: string;
  /** Indicatif téléphonique, ex: "+41" */
  code: string;
  country: string;
}

/**
 * Tous les pays / territoires avec leur indicatif.
 * Suisse et France sont aussi dans cette liste, puis épinglés en tête du menu.
 */
const ALL_COUNTRIES: PhoneCode[] = [
  { id: 'AF', code: '+93', country: 'Afghanistan' },
  { id: 'ZA', code: '+27', country: 'Afrique du Sud' },
  { id: 'AL', code: '+355', country: 'Albanie' },
  { id: 'DZ', code: '+213', country: 'Algérie' },
  { id: 'DE', code: '+49', country: 'Allemagne' },
  { id: 'AD', code: '+376', country: 'Andorre' },
  { id: 'AO', code: '+244', country: 'Angola' },
  { id: 'AI', code: '+1', country: 'Anguilla' },
  { id: 'AG', code: '+1', country: 'Antigua-et-Barbuda' },
  { id: 'SA', code: '+966', country: 'Arabie saoudite' },
  { id: 'AR', code: '+54', country: 'Argentine' },
  { id: 'AM', code: '+374', country: 'Arménie' },
  { id: 'AW', code: '+297', country: 'Aruba' },
  { id: 'AU', code: '+61', country: 'Australie' },
  { id: 'AT', code: '+43', country: 'Autriche' },
  { id: 'AZ', code: '+994', country: 'Azerbaïdjan' },
  { id: 'BS', code: '+1', country: 'Bahamas' },
  { id: 'BH', code: '+973', country: 'Bahreïn' },
  { id: 'BD', code: '+880', country: 'Bangladesh' },
  { id: 'BB', code: '+1', country: 'Barbade' },
  { id: 'BE', code: '+32', country: 'Belgique' },
  { id: 'BZ', code: '+501', country: 'Belize' },
  { id: 'BJ', code: '+229', country: 'Bénin' },
  { id: 'BM', code: '+1', country: 'Bermudes' },
  { id: 'BT', code: '+975', country: 'Bhoutan' },
  { id: 'BY', code: '+375', country: 'Biélorussie' },
  { id: 'BO', code: '+591', country: 'Bolivie' },
  { id: 'BQ', code: '+599', country: 'Bonaire, Saint-Eustache et Saba' },
  { id: 'BA', code: '+387', country: 'Bosnie-Herzégovine' },
  { id: 'BW', code: '+267', country: 'Botswana' },
  { id: 'BR', code: '+55', country: 'Brésil' },
  { id: 'BN', code: '+673', country: 'Brunei' },
  { id: 'BG', code: '+359', country: 'Bulgarie' },
  { id: 'BF', code: '+226', country: 'Burkina Faso' },
  { id: 'BI', code: '+257', country: 'Burundi' },
  { id: 'KH', code: '+855', country: 'Cambodge' },
  { id: 'CM', code: '+237', country: 'Cameroun' },
  { id: 'CA', code: '+1', country: 'Canada' },
  { id: 'CV', code: '+238', country: 'Cap-Vert' },
  { id: 'CL', code: '+56', country: 'Chili' },
  { id: 'CN', code: '+86', country: 'Chine' },
  { id: 'CY', code: '+357', country: 'Chypre' },
  { id: 'CO', code: '+57', country: 'Colombie' },
  { id: 'KM', code: '+269', country: 'Comores' },
  { id: 'CG', code: '+242', country: 'Congo-Brazzaville' },
  { id: 'CD', code: '+243', country: 'Congo-Kinshasa' },
  { id: 'KR', code: '+82', country: 'Corée du Sud' },
  { id: 'KP', code: '+850', country: 'Corée du Nord' },
  { id: 'CR', code: '+506', country: 'Costa Rica' },
  { id: 'CI', code: '+225', country: "Côte d'Ivoire" },
  { id: 'HR', code: '+385', country: 'Croatie' },
  { id: 'CU', code: '+53', country: 'Cuba' },
  { id: 'CW', code: '+599', country: 'Curaçao' },
  { id: 'DK', code: '+45', country: 'Danemark' },
  { id: 'DJ', code: '+253', country: 'Djibouti' },
  { id: 'DM', code: '+1', country: 'Dominique' },
  { id: 'EG', code: '+20', country: 'Égypte' },
  { id: 'AE', code: '+971', country: 'Émirats arabes unis' },
  { id: 'EC', code: '+593', country: 'Équateur' },
  { id: 'ER', code: '+291', country: 'Érythrée' },
  { id: 'ES', code: '+34', country: 'Espagne' },
  { id: 'EE', code: '+372', country: 'Estonie' },
  { id: 'SZ', code: '+268', country: 'Eswatini' },
  { id: 'US', code: '+1', country: 'États-Unis' },
  { id: 'ET', code: '+251', country: 'Éthiopie' },
  { id: 'FJ', code: '+679', country: 'Fidji' },
  { id: 'FI', code: '+358', country: 'Finlande' },
  { id: 'FR', code: '+33', country: 'France' },
  { id: 'GA', code: '+241', country: 'Gabon' },
  { id: 'GM', code: '+220', country: 'Gambie' },
  { id: 'GE', code: '+995', country: 'Géorgie' },
  { id: 'GH', code: '+233', country: 'Ghana' },
  { id: 'GI', code: '+350', country: 'Gibraltar' },
  { id: 'GR', code: '+30', country: 'Grèce' },
  { id: 'GD', code: '+1', country: 'Grenade' },
  { id: 'GL', code: '+299', country: 'Groenland' },
  { id: 'GP', code: '+590', country: 'Guadeloupe' },
  { id: 'GU', code: '+1', country: 'Guam' },
  { id: 'GT', code: '+502', country: 'Guatemala' },
  { id: 'GG', code: '+44', country: 'Guernesey' },
  { id: 'GN', code: '+224', country: 'Guinée' },
  { id: 'GQ', code: '+240', country: 'Guinée équatoriale' },
  { id: 'GW', code: '+245', country: 'Guinée-Bissau' },
  { id: 'GY', code: '+592', country: 'Guyana' },
  { id: 'GF', code: '+594', country: 'Guyane française' },
  { id: 'HT', code: '+509', country: 'Haïti' },
  { id: 'HN', code: '+504', country: 'Honduras' },
  { id: 'HK', code: '+852', country: 'Hong Kong' },
  { id: 'HU', code: '+36', country: 'Hongrie' },
  { id: 'IM', code: '+44', country: 'Île de Man' },
  { id: 'KY', code: '+1', country: 'Îles Caïmans' },
  { id: 'CK', code: '+682', country: 'Îles Cook' },
  { id: 'FO', code: '+298', country: 'Îles Féroé' },
  { id: 'FK', code: '+500', country: 'Îles Malouines' },
  { id: 'MP', code: '+1', country: 'Îles Mariannes du Nord' },
  { id: 'MH', code: '+692', country: 'Îles Marshall' },
  { id: 'SB', code: '+677', country: 'Îles Salomon' },
  { id: 'TC', code: '+1', country: 'Îles Turques-et-Caïques' },
  { id: 'VG', code: '+1', country: 'Îles Vierges britanniques' },
  { id: 'VI', code: '+1', country: 'Îles Vierges des États-Unis' },
  { id: 'IN', code: '+91', country: 'Inde' },
  { id: 'ID', code: '+62', country: 'Indonésie' },
  { id: 'IQ', code: '+964', country: 'Irak' },
  { id: 'IR', code: '+98', country: 'Iran' },
  { id: 'IE', code: '+353', country: 'Irlande' },
  { id: 'IS', code: '+354', country: 'Islande' },
  { id: 'IL', code: '+972', country: 'Israël' },
  { id: 'IT', code: '+39', country: 'Italie' },
  { id: 'JM', code: '+1', country: 'Jamaïque' },
  { id: 'JP', code: '+81', country: 'Japon' },
  { id: 'JE', code: '+44', country: 'Jersey' },
  { id: 'JO', code: '+962', country: 'Jordanie' },
  { id: 'KZ', code: '+7', country: 'Kazakhstan' },
  { id: 'KE', code: '+254', country: 'Kenya' },
  { id: 'KG', code: '+996', country: 'Kirghizistan' },
  { id: 'KI', code: '+686', country: 'Kiribati' },
  { id: 'XK', code: '+383', country: 'Kosovo' },
  { id: 'KW', code: '+965', country: 'Koweït' },
  { id: 'LA', code: '+856', country: 'Laos' },
  { id: 'LS', code: '+266', country: 'Lesotho' },
  { id: 'LV', code: '+371', country: 'Lettonie' },
  { id: 'LB', code: '+961', country: 'Liban' },
  { id: 'LR', code: '+231', country: 'Liberia' },
  { id: 'LY', code: '+218', country: 'Libye' },
  { id: 'LI', code: '+423', country: 'Liechtenstein' },
  { id: 'LT', code: '+370', country: 'Lituanie' },
  { id: 'LU', code: '+352', country: 'Luxembourg' },
  { id: 'MO', code: '+853', country: 'Macao' },
  { id: 'MK', code: '+389', country: 'Macédoine du Nord' },
  { id: 'MG', code: '+261', country: 'Madagascar' },
  { id: 'MY', code: '+60', country: 'Malaisie' },
  { id: 'MW', code: '+265', country: 'Malawi' },
  { id: 'MV', code: '+960', country: 'Maldives' },
  { id: 'ML', code: '+223', country: 'Mali' },
  { id: 'MT', code: '+356', country: 'Malte' },
  { id: 'MA', code: '+212', country: 'Maroc' },
  { id: 'MQ', code: '+596', country: 'Martinique' },
  { id: 'MU', code: '+230', country: 'Maurice' },
  { id: 'MR', code: '+222', country: 'Mauritanie' },
  { id: 'YT', code: '+262', country: 'Mayotte' },
  { id: 'MX', code: '+52', country: 'Mexique' },
  { id: 'FM', code: '+691', country: 'Micronésie' },
  { id: 'MD', code: '+373', country: 'Moldavie' },
  { id: 'MC', code: '+377', country: 'Monaco' },
  { id: 'MN', code: '+976', country: 'Mongolie' },
  { id: 'ME', code: '+382', country: 'Monténégro' },
  { id: 'MS', code: '+1', country: 'Montserrat' },
  { id: 'MZ', code: '+258', country: 'Mozambique' },
  { id: 'MM', code: '+95', country: 'Myanmar' },
  { id: 'NA', code: '+264', country: 'Namibie' },
  { id: 'NR', code: '+674', country: 'Nauru' },
  { id: 'NP', code: '+977', country: 'Népal' },
  { id: 'NI', code: '+505', country: 'Nicaragua' },
  { id: 'NE', code: '+227', country: 'Niger' },
  { id: 'NG', code: '+234', country: 'Nigeria' },
  { id: 'NU', code: '+683', country: 'Niue' },
  { id: 'NO', code: '+47', country: 'Norvège' },
  { id: 'NC', code: '+687', country: 'Nouvelle-Calédonie' },
  { id: 'NZ', code: '+64', country: 'Nouvelle-Zélande' },
  { id: 'OM', code: '+968', country: 'Oman' },
  { id: 'UG', code: '+256', country: 'Ouganda' },
  { id: 'UZ', code: '+998', country: 'Ouzbékistan' },
  { id: 'PK', code: '+92', country: 'Pakistan' },
  { id: 'PW', code: '+680', country: 'Palaos' },
  { id: 'PS', code: '+970', country: 'Palestine' },
  { id: 'PA', code: '+507', country: 'Panama' },
  { id: 'PG', code: '+675', country: 'Papouasie-Nouvelle-Guinée' },
  { id: 'PY', code: '+595', country: 'Paraguay' },
  { id: 'NL', code: '+31', country: 'Pays-Bas' },
  { id: 'PE', code: '+51', country: 'Pérou' },
  { id: 'PH', code: '+63', country: 'Philippines' },
  { id: 'PL', code: '+48', country: 'Pologne' },
  { id: 'PF', code: '+689', country: 'Polynésie française' },
  { id: 'PR', code: '+1', country: 'Porto Rico' },
  { id: 'PT', code: '+351', country: 'Portugal' },
  { id: 'QA', code: '+974', country: 'Qatar' },
  { id: 'RE', code: '+262', country: 'La Réunion' },
  { id: 'RO', code: '+40', country: 'Roumanie' },
  { id: 'GB', code: '+44', country: 'Royaume-Uni' },
  { id: 'RU', code: '+7', country: 'Russie' },
  { id: 'RW', code: '+250', country: 'Rwanda' },
  { id: 'BL', code: '+590', country: 'Saint-Barthélemy' },
  { id: 'KN', code: '+1', country: 'Saint-Kitts-et-Nevis' },
  { id: 'SM', code: '+378', country: 'Saint-Marin' },
  { id: 'MF', code: '+590', country: 'Saint-Martin' },
  { id: 'SX', code: '+1', country: 'Saint-Martin (Pays-Bas)' },
  { id: 'PM', code: '+508', country: 'Saint-Pierre-et-Miquelon' },
  { id: 'VA', code: '+379', country: 'Saint-Siège' },
  { id: 'VC', code: '+1', country: 'Saint-Vincent-et-les-Grenadines' },
  { id: 'SH', code: '+290', country: 'Sainte-Hélène' },
  { id: 'LC', code: '+1', country: 'Sainte-Lucie' },
  { id: 'SV', code: '+503', country: 'Salvador' },
  { id: 'WS', code: '+685', country: 'Samoa' },
  { id: 'AS', code: '+1', country: 'Samoa américaines' },
  { id: 'ST', code: '+239', country: 'Sao Tomé-et-Principe' },
  { id: 'SN', code: '+221', country: 'Sénégal' },
  { id: 'RS', code: '+381', country: 'Serbie' },
  { id: 'SC', code: '+248', country: 'Seychelles' },
  { id: 'SL', code: '+232', country: 'Sierra Leone' },
  { id: 'SG', code: '+65', country: 'Singapour' },
  { id: 'SK', code: '+421', country: 'Slovaquie' },
  { id: 'SI', code: '+386', country: 'Slovénie' },
  { id: 'SO', code: '+252', country: 'Somalie' },
  { id: 'SD', code: '+249', country: 'Soudan' },
  { id: 'SS', code: '+211', country: 'Soudan du Sud' },
  { id: 'LK', code: '+94', country: 'Sri Lanka' },
  { id: 'SE', code: '+46', country: 'Suède' },
  { id: 'CH', code: '+41', country: 'Suisse' },
  { id: 'SR', code: '+597', country: 'Suriname' },
  { id: 'SY', code: '+963', country: 'Syrie' },
  { id: 'TJ', code: '+992', country: 'Tadjikistan' },
  { id: 'TW', code: '+886', country: 'Taïwan' },
  { id: 'TZ', code: '+255', country: 'Tanzanie' },
  { id: 'TD', code: '+235', country: 'Tchad' },
  { id: 'CZ', code: '+420', country: 'Tchéquie' },
  { id: 'TH', code: '+66', country: 'Thaïlande' },
  { id: 'TL', code: '+670', country: 'Timor oriental' },
  { id: 'TG', code: '+228', country: 'Togo' },
  { id: 'TK', code: '+690', country: 'Tokelau' },
  { id: 'TO', code: '+676', country: 'Tonga' },
  { id: 'TT', code: '+1', country: 'Trinité-et-Tobago' },
  { id: 'TN', code: '+216', country: 'Tunisie' },
  { id: 'TM', code: '+993', country: 'Turkménistan' },
  { id: 'TR', code: '+90', country: 'Turquie' },
  { id: 'TV', code: '+688', country: 'Tuvalu' },
  { id: 'UA', code: '+380', country: 'Ukraine' },
  { id: 'UY', code: '+598', country: 'Uruguay' },
  { id: 'VU', code: '+678', country: 'Vanuatu' },
  { id: 'VE', code: '+58', country: 'Venezuela' },
  { id: 'VN', code: '+84', country: 'Viêt Nam' },
  { id: 'WF', code: '+681', country: 'Wallis-et-Futuna' },
  { id: 'YE', code: '+967', country: 'Yémen' },
  { id: 'ZM', code: '+260', country: 'Zambie' },
  { id: 'ZW', code: '+263', country: 'Zimbabwe' },
];

const PINNED_IDS = ['CH', 'FR'] as const;

/** Quand plusieurs pays partagent un indicatif, on choisit celui-ci au rechargement. */
const DEFAULT_ID_FOR_CODE: Record<string, string> = {
  '+1': 'US',
  '+7': 'RU',
  '+44': 'GB',
  '+590': 'GP',
  '+262': 'RE',
  '+599': 'CW',
};

export const PINNED_PHONE_CODES: PhoneCode[] = PINNED_IDS.map(
  (id) => ALL_COUNTRIES.find((item) => item.id === id)!,
);

export const OTHER_PHONE_CODES: PhoneCode[] = ALL_COUNTRIES.filter(
  (item) => !PINNED_IDS.includes(item.id as (typeof PINNED_IDS)[number]),
).sort((a, b) => a.country.localeCompare(b.country, 'fr'));

export const ALL_PHONE_CODES = [...PINNED_PHONE_CODES, ...OTHER_PHONE_CODES];

export function findPhoneCodeById(id: string): PhoneCode | undefined {
  return ALL_PHONE_CODES.find((item) => item.id === id);
}

/** Pays à afficher pour un indicatif déjà enregistré. */
export function preferredPhoneCodeId(code: string): string {
  const pinned = PINNED_PHONE_CODES.find((item) => item.code === code);
  if (pinned) return pinned.id;
  const preferred = DEFAULT_ID_FOR_CODE[code];
  if (preferred && ALL_PHONE_CODES.some((item) => item.id === preferred)) return preferred;
  return ALL_PHONE_CODES.find((item) => item.code === code)?.id ?? 'CH';
}

/** Extrait l'indicatif et le numéro local d'une valeur stockée */
export function parsePhoneNumber(value: string): { id: string; code: string; number: string } {
  if (!value?.trim()) {
    return { id: 'CH', code: '+41', number: '' };
  }

  const normalized = value.trim();
  const codes = [...new Set(ALL_PHONE_CODES.map((item) => item.code))].sort(
    (a, b) => b.length - a.length,
  );

  for (const code of codes) {
    if (normalized.startsWith(code)) {
      return {
        id: preferredPhoneCodeId(code),
        code,
        number: normalized.slice(code.length).replace(/^[\s-]+/, ''),
      };
    }
  }

  return { id: 'CH', code: '+41', number: normalized };
}

/** Combine indicatif + numéro local */
export function formatPhoneNumber(code: string, number: string): string {
  const cleaned = number.replace(/[^\d\s]/g, '').trim();
  if (!cleaned) return '';
  return `${code} ${cleaned}`;
}
