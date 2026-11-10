# 🏭 Guide de démarrage - FicsitManager

Bienvenue sur **FicsitManager** ! Voici comment configurer et lancer ton gestionnaire d'usine Satisfactory.

## 📋 Ce dont tu as besoin

1. **Un projet Supabase** (gratuit) pour la base de données
2. **Node.js** version 20 ou supérieure
3. **pnpm** (sera installé automatiquement si nécessaire)

## 🚀 Installation rapide (5 minutes)

### Étape 1 : Créer ton projet Supabase

1. Va sur [supabase.com](https://supabase.com)
2. Clique sur "Start your project" (gratuit, pas besoin de carte bancaire)
3. Crée un nouveau projet :
   - Choisis un nom (par exemple "ficsit-manager")
   - Choisis un mot de passe (tu n'en auras pas besoin après)
   - Choisis une région proche de chez toi (Europe West par exemple)

⏰ Le projet met **~2 minutes** à se créer.

### Étape 2 : Récupérer tes clés Supabase

Une fois ton projet créé :

1. Va dans **Settings** (⚙️ en bas à gauche)
2. Clique sur **API**
3. Tu verras deux informations importantes :
   - **Project URL** (commence par `https://...supabase.co`)
   - **anon / public key** (une longue clé qui commence par `eyJ...`)

📝 **Copie ces deux valeurs**, tu en auras besoin juste après !

### Étape 3 : Configurer l'application

Dans le terminal, à la racine du projet :

```bash
# 1. Copier le fichier d'exemple
cp apps/web/.env.example apps/web/.env.local

# 2. Ouvrir le fichier avec ton éditeur
# Remplace les valeurs par celles que tu as copiées :
# - Remplace "https://ton-projet.supabase.co" par ton Project URL
# - Remplace "ta-clé-anon-ici" par ta anon key
```

Ton fichier `apps/web/.env.local` devrait ressembler à ça :
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Étape 4 : Appliquer le schéma de base de données

Tu dois maintenant créer les tables dans Supabase :

```bash
# 1. Installer Supabase CLI (une seule fois)
npx supabase login

# 2. Lier ton projet (remplace XXX par ton project ref)
# Tu trouves le project ref dans l'URL de ton projet Supabase
# Par exemple : https://supabase.com/dashboard/project/XXX
npx supabase link --project-ref XXX

# 3. Appliquer les migrations (créer les tables)
npx supabase db push
```

✅ Ta base de données est prête avec toutes les recettes de Satisfactory !

### Étape 5 : Installer les dépendances

```bash
npx pnpm install
```

⏰ Cela prend environ **1 minute**.

### Étape 6 : Lancer l'application !

```bash
npx pnpm dev
```

🎉 **C'est prêt !** Ouvre ton navigateur sur **http://localhost:3000**

## 📱 Créer ton compte

1. Sur la page de connexion, clique sur **"S'inscrire"**
2. Entre ton email et un mot de passe
3. Tu es directement connecté !

## 🎮 Utiliser FicsitManager

### 1. Créer ta première usine

- Clique sur **"Nouvelle usine"**
- Donne-lui un nom (ex: "Usine Fer Principal")
- Ajoute une description si tu veux
- Clique sur **"Créer"**

### 2. Ajouter des extracteurs

- Va dans l'onglet **"⛏️ Extracteurs"**
- Clique sur **"Ajouter un extracteur"**
- Remplis les informations :
  - **Ressource** : Choisis ce que tu mines (fer, cuivre, etc.)
  - **Type de mineur** : Mk.1, Mk.2 ou Mk.3
  - **Pureté du nœud** : Impur (50%), Normal (100%) ou Pur (200%)
  - **Nombre** : Combien de mineurs identiques tu as
  - **Overclock** : 100% par défaut, jusqu'à 250%
- Le calcul de production se fait automatiquement !

### 3. Voir tes statistiques

- Va dans l'onglet **"📊 Analyse"**
- Tu verras :
  - Le nombre total d'extracteurs
  - Tes ressources extraites avec des graphiques
  - Ta consommation d'énergie
  - Des recommandations pour optimiser ta production

## 📱 Installer sur iPhone ou Mac

### Sur iPhone (Safari)

1. Ouvre l'app dans Safari
2. Appuie sur le bouton Partager (carré avec flèche vers le haut)
3. Descends et choisis **"Sur l'écran d'accueil"**
4. Appuie sur **"Ajouter"**

L'icône 🏭 FicsitManager apparaît sur ton écran d'accueil !

### Sur Mac

1. Ouvre l'app dans Safari ou Chrome
2. Clique sur l'icône d'installation dans la barre d'adresse
3. Clique sur **"Installer"**

L'app s'ouvre maintenant comme une vraie application Mac !

## ❓ Questions fréquentes

### Mon mineur extrait-il vraiment ce débit ?

Oui ! Les calculs sont basés sur les formules officielles de Satisfactory :
- Mineur Mk.1 : 60 items/min sur un nœud normal
- Mineur Mk.2 : 120 items/min sur un nœud normal
- Mineur Mk.3 : 240 items/min sur un nœud normal

Avec les multiplicateurs de pureté et overclock.

### Puis-je avoir plusieurs usines ?

Oui ! Tu peux créer autant d'usines que tu veux et passer de l'une à l'autre.

### Où sont stockées mes données ?

Dans ta base de données Supabase. Elles sont sécurisées et sauvegardées automatiquement.

### L'app fonctionne-t-elle hors ligne ?

Pas encore, mais c'est prévu dans une prochaine version !

### Comment ajouter des lignes de production ?

La fonctionnalité est en cours de développement. Pour l'instant, concentre-toi sur tes extracteurs !

## 🆘 Problèmes courants

### "Cannot connect to Supabase"

- Vérifie que tu as bien copié l'URL et la clé dans `.env.local`
- Vérifie qu'il n'y a pas d'espace en trop
- Redémarre le serveur (`Ctrl+C` puis `npx pnpm dev`)

### "Migration failed"

- Vérifie que tu as bien fait `npx supabase link` avec le bon project ref
- Essaye de relancer `npx supabase db push`

### L'application ne s'affiche pas

- Vérifie que tu es bien sur `http://localhost:3000`
- Vérifie que le serveur est lancé (tu dois voir des logs dans le terminal)
- Essaye de rafraîchir la page (Cmd+R ou Ctrl+R)

## 🎯 Prochaines fonctionnalités

- ✅ Extracteurs et mineurs (fait !)
- 🚧 Lignes de production (constructeurs, assembleurs, etc.)
- 🚧 Calcul automatique des chaînes de production
- 🚧 Import/export de configurations
- 🚧 Mode hors ligne
- 🚧 Recettes alternatives complètes

## 💡 Astuces

1. **Nomme tes usines clairement** : "Fer Nord", "Cuivre Sud", etc.
2. **Vérifie ta consommation d'énergie** : elle est affichée dans l'onglet Analyse
3. **L'overclock consomme beaucoup** : au-delà de 100%, la consommation augmente de façon exponentielle
4. **Utilise les nœuds purs en priorité** : ils donnent 2x plus que les normaux !

---

Bon jeu et bonnes productions ! 🏭⚡

Si tu as des questions ou des suggestions, n'hésite pas ! 😊
