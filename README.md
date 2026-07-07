# Globus Livraison — La Vélopostale

Application web permettant aux collaborateurs Globus de commander une course de livraison auprès du coursier **Vélopostale**.

## Architecture

Monorepo **Turborepo** + **pnpm** en TypeScript strict :

```
globus-livraison/
├── apps/
│   ├── web/          # Next.js 14 (App Router) — application principale
│   └── mobile/       # Expo (React Native) — scaffold Phase 2
├── packages/
│   ├── core/         # Logique métier partagée (Zod, créneaux, tarifs, Supabase)
│   ├── ui/           # Tokens de design
│   └── config/       # Configs partagées (TypeScript, ESLint, Prettier)
└── supabase/         # Migrations SQL + seed
```

## Prérequis

- **Node.js** ≥ 20
- **pnpm** 9 (via `npx pnpm` ou `corepack enable`)
- Un projet **Supabase** cloud (gratuit) : [supabase.com](https://supabase.com)
- (Optionnel) Compte **Resend** pour les emails : [resend.com](https://resend.com)

## Installation

```bash
# Cloner et installer les dépendances
npx pnpm install

# Copier les variables d'environnement
cp .env.example apps/web/.env.local
# Éditer apps/web/.env.local avec vos clés Supabase et Resend
```

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer l'URL et les clés (Settings → API) dans `apps/web/.env.local`
3. Appliquer les migrations :

```bash
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_REF
npx supabase db push
```

4. Exécuter le seed (SQL Editor dans le dashboard Supabase) :

```bash
# Copier le contenu de supabase/seed.sql dans le SQL Editor Supabase
```

5. Créer les comptes de test (Authentication → Users → Add user) :

| E-mail | Mot de passe | Rôle |
|--------|--------------|------|
| `admin@globus.test` | `Admin123!` | admin |
| `collab@globus.test` | `Collab123!` | collaborateur |

6. Créer les profils correspondants (SQL Editor) :

```sql
-- Remplacer les UUID par ceux des users auth créés
INSERT INTO profiles (id, full_name, role, department, active) VALUES
  ('UUID_ADMIN', 'Admin Test', 'admin', 'service_client', true),
  ('UUID_COLLAB', 'Collaborateur Test', 'collaborateur', 'service_cadeaux', true);
```

## Lancement

```bash
# Développement (web)
npx pnpm dev

# L'app est accessible sur http://localhost:3000
```

## Tests

```bash
# Tests unitaires (packages/core)
npx pnpm --filter @globus/core test
```

## Pages web

| Route | Description |
|-------|-------------|
| `/fr/login` | Connexion |
| `/fr/orders/new` | Nouvelle commande |
| `/fr/orders/new/review` | Récapitulatif avant validation |
| `/fr/orders` | Historique des courses |
| `/fr/orders/[id]` | Détail d'une course |
| `/fr/stats` | Statistiques |
| `/fr/admin` | Administration (admin uniquement) |

## Emails

À la confirmation d'une commande, deux emails sont envoyés via Resend :
1. **Dispatch Vélopostale** → `DISPATCH_EMAIL` (défaut : `dispo@coursier.ch`)
2. **Récap Globus** → créateur + `GLOBUS_NOTIFICATION_EMAIL`

Pour les tests, redirigez les deux vers votre boîte dans `.env.local`.

## Mobile (Phase 2)

```bash
cd apps/mobile
npx pnpm dev
# Scanner le QR code avec Expo Go
```

L'app mobile importe `@globus/core` et affiche un écran placeholder.

## À confirmer

Les points suivants sont des **hypothèses** en attente de validation :

1. **Champ hôtel** : obligatoire uniquement si `is_hotel = true` (pas pour toutes les livraisons).
2. **Créneaux horaires** : fenêtres de **2h toutes les 30 min** (le brief mélange des exemples 1h et 2h). La fonction `generateTimeSlots` dans `packages/core` est isolée pour ajustement trivial.
3. **Calcul du tarif** : tarif de base paramétrable en admin + `price_chf` ajustable manuellement. Structure prête pour une grille Vélopostale plus tard.
4. **Adresses email Globus** : paramétrables en admin (`globus_notification_email`), valeur par défaut `livraison@globus.ch` à confirmer.
5. **Historique** : visible par tous les collaborateurs authentifiés (pas seulement l'auteur).

## Intégration Logtech (future)

Un adapter stub `LogtechClient` est disponible dans `packages/core/src/integrations/logtech.ts`. Il n'est pas implémenté — les méthodes loggent un avertissement et retournent des valeurs factices.

## Scripts utiles

```bash
npx pnpm dev          # Lancer le web en dev
npx pnpm build        # Build tout le monorepo
npx pnpm lint         # Linter
npx pnpm test         # Tests
npx pnpm format       # Prettier
```

## Licence

Propriétaire — Globus / usage interne.
