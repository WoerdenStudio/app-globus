import { Badge } from '@/components/ui/badge';

/** Petit bandeau quand l'adresse n'est pas dans la grille tarifaire. */
export function PriceHiddenHint({ label }: { label: string }) {
  return (
    <Badge variant="outline" title={label}>
      {label}
    </Badge>
  );
}
