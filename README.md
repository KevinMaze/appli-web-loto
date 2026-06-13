# LotoStats 🎱⭐

Application web de statistiques pour le **Loto** et l'**EuroMillions**, construite avec Next.js 14. Données officielles FDJ open-source, 100 % gratuit, aucune IA.

---

## Fonctionnalités

- **Dernier tirage** mis en valeur avec animation au chargement
- **Historique complet** des tirages (depuis 2006 pour EuroMillions, 2008 pour le Loto)
- **Statistiques** :
  - Fréquence de sortie de chaque numéro (graphique)
  - Numéros chauds (top 10 les plus sortis)
  - Numéros froids (top 10 les moins sortis)
  - Écart depuis le dernier passage
  - Somme moyenne par tirage
- **Filtres de recherche** : plage de dates, numéros à inclure
- **Grilles de suggestion** : jusqu'à 3 grilles générées avec 3 stratégies (équilibré, chaud, froid)
- **Responsive** : mobile, tablette, desktop
- **Animations fluides** avec Framer Motion
- **Rafraîchissement automatique** des données toutes les heures

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Style | Tailwind CSS |
| Animations | Framer Motion |
| Graphiques | Recharts |
| Data fetching | SWR (cache + auto-refresh) |
| État global | Zustand (persisté localStorage) |
| Parsing CSV | PapaParse |
| ZIP extraction | JSZip |
| Dates | date-fns |

---

## Source des données

L'application utilise une **stratégie hybride à 3 couches** pour couvrir l'historique le plus complet possible :

### 1. CSV FDJ open data (2004–juillet 2024)
- ZIP publics sur `cdn-media.fdj.fr/static-draws/csv/`
- Licence Ouverte v2.0 — gratuit, sans clé API
- Gelés depuis juillet 2024 (FDJ ne les met plus à jour)
- Couvre ~2367 tirages Loto (2008–2024) et ~1006 EuroMillions (2004–2024)

### 2. Supplément historique (juillet 2024 – présent)
- **EuroMillions** : scraped depuis [loterieplus.com](https://www.loterieplus.com) via les pages de tirage séquentielles (tirage 1758→dernier)
- **Loto** : scraped depuis [loterieplus.com](https://www.loterieplus.com) via le formulaire de résultats par date
- Stocké dans `public/historical-supplement.json` (généré par `scripts/fetchMissingDraws.mjs`)

### 3. Tirages très récents (live)
- Scraping du site FDJ (SSR Next.js) pour les ~5 derniers tirages
- Mis en cache 1 heure (`revalidate: 3600`)

> **Note :** La période août 2024–décembre 2025 pour le Loto n'est pas disponible en open data.
> Les statistiques Loto portent sur 2008–2024 + 2026–présent.
> Pour l'EuroMillions, la couverture est complète depuis 2004.

### Script de mise à jour
```bash
node scripts/fetchMissingDraws.mjs
```
À relancer périodiquement pour mettre à jour `public/historical-supplement.json`.

**Aucune clé API requise.**

---

## Installation et lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en développement
npm run dev

# 3. Build de production
npm run build
npm start
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Déploiement sur Vercel

```bash
# Via Vercel CLI
npm i -g vercel
vercel deploy

# Ou connecter le repo GitHub à vercel.com/new
```

Le projet est prêt pour Vercel sans configuration supplémentaire :
- Les routes `/api/loto` et `/api/euromillions` deviennent des **Serverless Functions**
- Le cache `revalidate: 3600` est respecté par le CDN Vercel (ISR)
- Aucune variable d'environnement requise pour le fonctionnement de base

---

## Architecture des routes API

```
GET /api/loto
  → Télécharge les ZIP FDJ
  → Extrait les CSV
  → Parse et dédoublonne les tirages
  → Retourne JSON { draws, total, lastUpdated }
  → Cache serveur : 1 heure

GET /api/euromillions
  → Même logique pour EuroMillions
```

---

## Algorithme de génération des grilles

Les grilles sont générées par **sélection pondérée** (roulette wheel selection) avec 3 stratégies :

| Stratégie | Logique |
|---|---|
| `balanced` (équilibré) | Mix 60% fréquence + 40% écart |
| `hot` (chauds) | Favorise les numéros les plus fréquents |
| `cold` (froids) | Favorise les numéros avec le plus grand écart |

Sans compte : **3 grilles maximum** (1 par stratégie).
Les grilles sont persistées dans le `localStorage` entre les sessions.

---

## 📋 Recommandations pour la fonctionnalité "Mon Compte"

### Backend recommandé : **Supabase**

Supabase est la solution la plus adaptée à ce projet pour les raisons suivantes :

**Pourquoi Supabase ?**
1. **PostgreSQL managé** avec Row Level Security (RLS) — parfait pour isoler les données par utilisateur
2. **Auth intégrée** (email/password, Google, GitHub…) — pas besoin d'un service séparé
3. **SDK JavaScript natif** compatible Next.js App Router
4. **Tier gratuit généreux** : 500 Mo BDD, 2 Go stockage, 50 000 utilisateurs actifs/mois
5. **Déploiement simple avec Vercel** : intégration officielle en 1 clic dans le dashboard Vercel

**Architecture suggérée pour "Mon Compte" :**

```
Supabase Auth → NextAuth.js adapter (ou Supabase Auth SSR natif)
    ↓
Table PostgreSQL : user_grids
  - id (uuid)
  - user_id (ref auth.users)
  - game ('loto' | 'euromillions')
  - numbers (int[])
  - extra (int[])
  - strategy (text)
  - created_at (timestamp)
```

**Alternatives considérées :**
- **PlanetScale** (MySQL) — bon choix mais moins simple à intégrer avec l'auth
- **Neon** (PostgreSQL serverless) — excellent pour Vercel, nécessite NextAuth.js séparé
- **Firebase** — fonctionne mais vendor lock-in Google, pricing moins prévisible
- **Railway** — simple mais pas de tier gratuit permanent

**Bibliothèques à ajouter pour "Mon Compte" :**
```bash
npm install @supabase/supabase-js @supabase/ssr
# ou avec NextAuth.js :
npm install next-auth @auth/supabase-adapter
```

**Variables d'environnement à ajouter (.env.local) :**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...   # côté serveur uniquement
```

**Ce qui changera dans l'app :**
- Le bouton "Connexion" dans la `Navigation` devient fonctionnel
- `useGridStore` (Zustand) est remplacé/complété par des appels Supabase
- La limite de 3 grilles passe à 10+ pour les utilisateurs connectés
- Un onglet "Mes grilles" affiche l'historique depuis la BDD

---

## Structure du projet

```
├── app/
│   ├── layout.tsx          # Layout global (Navigation, footer)
│   ├── page.tsx            # Page d'accueil
│   ├── loto/page.tsx       # Section Loto complète
│   ├── euromillions/page.tsx # Section EuroMillions complète
│   └── api/
│       ├── loto/route.ts   # API route : données Loto
│       └── euromillions/route.ts # API route : données EuroMillions
├── components/
│   ├── Navigation.tsx      # Barre de navigation
│   ├── LotteryBall.tsx     # Boules animées
│   ├── DrawCard.tsx        # Carte d'un tirage
│   ├── StatisticsPanel.tsx # Panneau stats avec onglets
│   ├── NumberFrequencyChart.tsx # Graphique Recharts
│   ├── SuggestionGrid.tsx  # Générateur de grilles
│   └── FilterPanel.tsx     # Filtres de recherche
├── lib/
│   ├── types.ts            # Types TypeScript partagés
│   ├── statistics.ts       # Algorithmes de stats
│   ├── gridGenerator.ts    # Algorithme de génération
│   └── store.ts            # Store Zustand (grilles)
└── hooks/
    ├── useLotoData.ts      # SWR hook Loto
    └── useEuromillionsData.ts # SWR hook EuroMillions
```

---

## Licence

Open source – données FDJ sous Licence Ouverte v2.0 / Etalab.
