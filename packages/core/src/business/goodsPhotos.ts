import type { TypedSupabaseClient } from '../supabase/client';

/** Bucket Supabase pour les photos de marchandise */
export const GOODS_PHOTOS_BUCKET = 'goods-photos';

/** Durée par défaut des liens signés (1 h) */
export const GOODS_PHOTO_SIGNED_URL_TTL_SEC = 3600;

/** Durée des liens signés dans les emails (7 jours) */
export const GOODS_PHOTO_EMAIL_SIGNED_URL_TTL_SEC = 7 * 24 * 3600;

/**
 * Normalise la valeur enregistrée en base : chemin interne du bucket.
 * Compatible avec les anciennes URLs publiques Supabase.
 */
export function normalizeGoodsPhotoPath(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;

  const value = stored.trim();
  const publicMarker = `/storage/v1/object/public/${GOODS_PHOTOS_BUCKET}/`;
  const signMarker = `/storage/v1/object/sign/${GOODS_PHOTOS_BUCKET}/`;

  if (value.includes(publicMarker)) {
    const path = value.split(publicMarker)[1]?.split('?')[0];
    return sanitizeGoodsPhotoPath(path ?? null);
  }

  if (value.includes(signMarker)) {
    const path = value.split(signMarker)[1]?.split('?')[0];
    return sanitizeGoodsPhotoPath(path ?? null);
  }

  return sanitizeGoodsPhotoPath(value);
}

/** Refuse les chemins dangereux ou les URLs complètes non reconnues */
function sanitizeGoodsPhotoPath(path: string | null): string | null {
  if (!path?.trim()) return null;
  const clean = path.trim().replace(/^\/+/, '');
  if (!clean || clean.includes('..') || clean.startsWith('http')) return null;
  return clean;
}

/** Génère une URL signée temporaire pour afficher une photo */
export async function resolveGoodsPhotoSignedUrl(
  client: TypedSupabaseClient,
  stored: string | null | undefined,
  expiresIn = GOODS_PHOTO_SIGNED_URL_TTL_SEC,
): Promise<string | null> {
  const path = normalizeGoodsPhotoPath(stored);
  if (!path) return null;

  const { data, error } = await client.storage
    .from(GOODS_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
