-- Un utilisateur peut modifier son propre profil (nom, service…),
-- mais ni son rôle ni son statut actif/désactivé : seul un admin peut les changer.
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND active = (SELECT active FROM profiles WHERE id = auth.uid())
  );
