import { Badge } from '@/components/ui/badge';
import { VELOPOSTALE_PHONE, VELOPOSTALE_PHONE_TEL } from '@/lib/velopostale';

/** Petit bandeau quand l'adresse n'est pas dans la grille tarifaire. */
export function PriceHiddenHint({ label }: { label: string }) {
  return (
    <Badge variant="outline" title={label}>
      {label}
    </Badge>
  );
}

/** Texte + numéro cliquable pour demander le tarif hors localité. */
export function PriceOutOfZoneCall({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {message}{' '}
      <a
        href={`tel:${VELOPOSTALE_PHONE_TEL}`}
        className="font-semibold text-foreground underline underline-offset-2"
      >
        {VELOPOSTALE_PHONE}
      </a>
    </p>
  );
}
