-- Rendre les photos de colis privées (accès via URL signée uniquement)
UPDATE storage.buckets
SET public = false
WHERE id = 'goods-photos';

DROP POLICY IF EXISTS "Anyone can view goods photos" ON storage.objects;

CREATE POLICY "Authenticated users can view goods photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'goods-photos' AND is_active_user());
