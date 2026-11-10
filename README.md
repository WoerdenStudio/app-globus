# FicsitManager 🏭

**Gestionnaire d'usine personnel pour Satisfactory**

FicsitManager est une application web moderne qui te permet de gérer et optimiser ton usine dans le jeu Satisfactory. Suit ta production, identifie les goulots d'étranglement et obtiens des recommandations intelligentes pour améliorer ton efficacité.

## ✨ Fonctionnalités

- 📊 **Tableau de bord complet** - Vue d'ensemble de toute ta production
- ⛏️ **Gestion des extracteurs** - Ajoute et gère facilement tes mineurs et extracteurs
- 🏗️ **Lignes de production** - Suit toutes tes chaînes de fabrication
- 📈 **Graphiques et statistiques** - Visualise ta production avec des graphiques élégants
- 🔍 **Analyse intelligente** - Identifie où ça coince dans ta production
- 💡 **Recommandations** - Suggestions sur quels bâtiments ajouter ou supprimer
- 🎯 **Calculs automatiques** - Calcule automatiquement les besoins en bâtiments
- 📱 **Installation mobile** - Installe l'app sur ton iPhone ou Mac comme une vraie application
- 🎨 **Design moderne** - Interface épurée et facile à utiliser

## 🗄️ Base de données

FicsitManager inclut toutes les recettes de Satisfactory :
- ✅ Recettes de base complètes
- ✅ Tous les minerais et ressources
- ✅ Tous les bâtiments (mineurs, constructeurs, assembleurs, etc.)
- ✅ Recettes alternatives (à venir)

## 🏗️ Architecture

Application moderne construite avec :
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Code typé et sécurisé
- **Supabase** - Base de données PostgreSQL cloud
- **Tailwind CSS** - Design moderne et responsive
- **Recharts** - Graphiques interactifs
- **PWA** - Installable sur tous les appareils

```
ficsit-manager/
├── apps/
│   └── web/              # Application Next.js principale
│       ├── src/
│       │   ├── app/      # Pages et routes
│       │   ├── components/ # Composants React
│       │   └── lib/      # Utilitaires
│       └── public/       # Assets statiques
├── packages/
│   ├── core/             # Logique métier (calculs, types)
│   ├── ui/               # Design tokens
│   └── config/           # Configuration partagée
└── supabase/             # Migrations de la base de données
```

## 🚀 Installation

### Prérequis

- **Node.js** ≥ 20
- **pnpm** 9
- Un projet **Supabase** gratuit : [supabase.com](https://supabase.com)

### Étapes

```bash
# 1. Installer les dépendances
npx pnpm install

# 2. Configurer les variables d'environnement
cp .env.example apps/web/.env.local
# Éditer apps/web/.env.local avec tes clés Supabase
```

### Configuration Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Récupère l'URL et les clés (Settings → API)
3. Mets-les dans `apps/web/.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=ton-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta-clé-anon
```

4. Applique les migrations :

```bash
# Connecte-toi à Supabase
npx supabase login

# Lie ton projet
npx supabase link --project-ref TON_PROJECT_REF

# Applique le schéma
npx supabase db push
```

5. Crée ton compte utilisateur :
   - Va dans Authentication → Users → Add user
   - Crée un compte avec ton email
   - Un profil sera créé automatiquement

## 🎮 Lancement

```bash
# Démarre le serveur de développement
npx pnpm dev

# L'application est accessible sur http://localhost:3000
```

## 📱 Installation sur iPhone/Mac

Une fois l'app lancée sur ton réseau local :

### Sur iPhone (Safari)
1. Ouvre l'app dans Safari
2. Appuie sur le bouton Partager
3. Sélectionne "Sur l'écran d'accueil"
4. L'app apparaît comme une vraie application !

### Sur Mac (Safari/Chrome)
1. Ouvre l'app dans ton navigateur
2. Clique sur l'icône d'installation dans la barre d'adresse
3. L'app s'installe comme une application native

## 🎯 Utilisation

### 1. Créer ton usine
- Va sur le dashboard
- Crée ta première usine
- Donne-lui un nom

### 2. Ajouter des extracteurs
- Va dans la section "Extracteurs"
- Clique sur "Ajouter un extracteur"
- Choisis :
  - Le minerai (fer, cuivre, etc.)
  - Le type de mineur (Mk.1, Mk.2, Mk.3)
  - La pureté du nœud (impur, normal, pur)
  - Le nombre d'extracteurs
  - L'overclock (100% par défaut)

### 3. Ajouter des lignes de production
- Va dans "Production"
- Ajoute tes chaînes de fabrication
- L'app calcule automatiquement :
  - Ce que tu produis
  - Ce que tu consommes
  - Où il y a des manques

### 4. Consulter les analyses
- Le dashboard te montre :
  - Tes ressources en surplus
  - Tes goulots d'étranglement
  - Les bâtiments manquants
  - Des recommandations d'optimisation

## 📊 Fonctionnalités du calculateur

FicsitManager calcule automatiquement :

- **Débit d'extraction** selon la pureté et l'overclock
- **Production réelle** de chaque chaîne
- **Consommation** de chaque ressource
- **Balance nette** (production - consommation)
- **Bâtiments nécessaires** pour équilibrer la production
- **Consommation électrique** totale

## 🎨 Design

Interface moderne avec :
- Thème clair/sombre automatique
- Design responsive (mobile, tablette, desktop)
- Graphiques interactifs
- Animations fluides
- Couleurs inspirées de Satisfactory

## 📝 À venir

- [ ] Recettes alternatives complètes
- [ ] Import/export de configurations
- [ ] Partage d'usines
- [ ] Mode hors-ligne
- [ ] Calculateur de power shards
- [ ] Planificateur de fabrication
- [ ] Support des fluides complet

## 🤝 Développement

```bash
# Lancer les tests
npx pnpm test

# Vérifier les types
npx pnpm typecheck

# Formater le code
npx pnpm format

# Linter
npx pnpm lint

# Build de production
npx pnpm build
```

## 📄 Licence

Usage personnel uniquement.

---

Bon jeu et bonnes productions ! 🏭⚡
