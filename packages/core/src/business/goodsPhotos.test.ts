import { describe, expect, it } from 'vitest';
import { normalizeGoodsPhotoPath, GOODS_PHOTOS_BUCKET } from './goodsPhotos';

describe('normalizeGoodsPhotoPath', () => {
  it('conserve un chemin interne', () => {
    expect(normalizeGoodsPhotoPath('user-id/123-photo.jpg')).toBe('user-id/123-photo.jpg');
  });

  it('extrait le chemin depuis une ancienne URL publique', () => {
    const url = `https://xxx.supabase.co/storage/v1/object/public/${GOODS_PHOTOS_BUCKET}/123-photo.jpg`;
    expect(normalizeGoodsPhotoPath(url)).toBe('123-photo.jpg');
  });

  it('rejette les chemins avec ..', () => {
    expect(normalizeGoodsPhotoPath('../secret')).toBeNull();
  });
});
