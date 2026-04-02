# ⛽ Essence QC — Prix de l'essence au Québec en temps réel

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Données ouvertes QC](https://img.shields.io/badge/Données-Régie%20de%20l'énergie%20QC-003DA5)](https://regieessencequebec.ca)

> **Trouvez l'essence la moins chère au Québec.** Application web gratuite et open source qui compare les prix de plus de 2 300 stations-service en temps réel. Carte interactive, planificateur de trajet, mode Costco et estimation d'économies — le tout basé sur les données officielles de la Régie de l'énergie du Québec.

**🔗 [Essayer l'application](https://essenceqc.ca)** · [Signaler un bug](../../issues/new?template=bug_report.md) · [Proposer une fonctionnalité](../../issues/new?template=feature_request.md)

---

## Fonctionnalités

- **🗺️ Vue carte (Google Maps)** — Stations les moins chères près de vous avec marqueurs de prix colorés
- **📋 Vue liste** — Stations triées par prix ou distance avec estimation d'économies par plein
- **🚗 Planificateur de trajet** — Google Places Autocomplete + stations les moins chères le long de votre itinéraire
- **💰 Indicateur d'économies** — Montre combien vous économisez vs le prix moyen
- **🏪 Mode Costco** — Affiche les 3 Costco les plus proches (activable dans les paramètres)
- **⚙️ Préférences sauvegardées** — Type d'essence, rayon de recherche, taille du réservoir
- **🔋 Filtre d'autonomie** — Filtre les stations hors portée sur le planificateur de trajet

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styles | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix |
| Cartes | Google Maps (Maps JavaScript API + Places API) |
| Données | GeoJSON compressé (Régie de l'énergie QC) |
| Itinéraire | OSRM (Open Source Routing Machine) — gratuit |
| Recherche | Google Places Autocomplete |
| State | React Context |
| Stockage | localStorage |

---

## Prérequis

### 1. Clé API Google Maps (obligatoire)

L'application utilise Google Maps pour la carte, les marqueurs et l'autocomplétion d'adresses.

#### Obtenir une clé API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet (ou sélectionnez un existant)
3. Allez dans **APIs & Services > Credentials**
4. Cliquez **Create Credentials > API key**
5. **Activez ces APIs** dans *APIs & Services > Library* :
   - **Maps JavaScript API**
   - **Places API**

#### Créer un Map ID (optionnel, mais recommandé)

Pour utiliser les `AdvancedMarker` (marqueurs personnalisés), il faut un Map ID :

1. Allez dans [Maps Management](https://console.cloud.google.com/google/maps-api/studio/maps)
2. Cliquez **Create Map ID**
3. Nom : `Essence QC`
4. Type : **JavaScript** / **Vector**
5. Copiez le Map ID généré

#### Restrictions de sécurité recommandées

Dans la console Google Cloud > Credentials > votre clé API :

- **Application restrictions** : HTTP referrers
  - `localhost:*` (dev)
  - `votre-domaine.com/*` (production)
- **API restrictions** : Restrict to Maps JavaScript API + Places API

### 2. Coûts Google Maps

| API | Gratuit / mois | Coût après |
|-----|---------------|------------|
| Maps JavaScript API (loads) | 28 000 chargements | $7.00 / 1000 |
| Places Autocomplete (per session) | $0 pour les 100k premiers | $2.83 / 1000 |
| Dynamic Maps | 28 000 loads | $7.00 / 1000 |

> **Google offre $200/mois de crédit gratuit**, ce qui couvre environ **28 000 chargements de carte + autocomplétions**. Pour un projet personnel ou communautaire, c'est généralement suffisant.

🔗 [Grille tarifaire complète](https://developers.google.com/maps/billing-and-pricing/pricing)

---

## Installation et démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la clé API
cp .env.example .env
# Éditez .env et ajoutez votre clé API Google Maps :
# VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
# VITE_GOOGLE_MAPS_MAP_ID=abc123 (optionnel)

# 3. Démarrer en mode développement
npm run dev

# 4. Build pour production
npm run build

# 5. Prévisualiser le build
npm run preview
```

### Variables d'environnement

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | ✅ | Clé API Google Maps |
| `VITE_GOOGLE_MAPS_MAP_ID` | ❌ | Map ID pour AdvancedMarkers (recommandé) |

---

## Déploiement

### Vercel (recommandé)

```bash
npx vercel --prod
```

Ou via l'interface web :
1. Connectez votre repo GitHub à [Vercel](https://vercel.com)
2. **Framework preset** : Vite
3. **Build command** : `npm run build`
4. **Output directory** : `dist`
5. Ajoutez les variables d'environnement dans Settings > Environment Variables

### Netlify

1. Connectez votre repo GitHub à [Netlify](https://netlify.com)
2. **Build command** : `npm run build`
3. **Publish directory** : `dist`
4. Ajoutez les variables d'environnement dans Site settings > Environment variables

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # Choisir "dist" comme répertoire public
npm run build
firebase deploy
```

Ajoutez les variables d'environnement dans un fichier `.env.production` avant le build.

---

## Architecture du projet

```
src/
├── components/          # Composants React
│   ├── ui/              # Composants shadcn/ui
│   ├── Header.tsx       # Header + toggle Carte/Liste
│   ├── MapView.tsx      # Vue carte + planificateur de trajet
│   ├── ListView.tsx     # Vue liste des stations
│   ├── CostcoBanner.tsx # Bannière Costco
│   ├── LoadingScreen.tsx
│   ├── SettingsDialog.tsx
│   └── StationDetailDialog.tsx
├── lib/                 # Logique métier
│   ├── data.ts          # Fetch + décompression GeoJSON
│   ├── helpers.ts       # Utilitaires (haversine, formatage, etc.)
│   ├── maps-config.ts   # Config Google Maps
│   ├── preferences.ts   # localStorage
│   ├── routing.ts       # Calcul de trajet (OSRM) + stations le long
│   └── utils.ts         # shadcn/ui cn() helper
├── store.tsx            # État global (React Context)
├── types.ts             # Types TypeScript
├── App.tsx              # Layout principal
└── main.tsx             # Point d'entrée
```

## Source de données

Les données proviennent de la **Régie de l'énergie du Québec** :
- URL : `https://regieessencequebec.ca/stations.geojson.gz`
- Format : GeoJSON compressé (gzip)
- Mise à jour : quotidienne
- ~2300 stations avec prix du Régulier, Super et Diesel
- En cas de blocage CORS, un proxy est utilisé automatiquement

## Services externes

| Service | Usage | Coût |
|---------|-------|------|
| Google Maps JavaScript API | Carte interactive | $200/mois gratuit |
| Google Places API | Autocomplétion d'adresses | Inclus dans le crédit |
| OSRM | Calcul d'itinéraire | **Gratuit** (open source) |
| Régie de l'énergie QC | Données de prix | **Gratuit** (données ouvertes) |

## Licence

AGPL-3.0 with Commons Clause — Voir [LICENSE](LICENSE)

Le code source est ouvert et consultable, mais l'utilisation commerciale (revente, service payant basé sur le logiciel) est interdite sans autorisation. Pour une licence commerciale, contactez l'équipe Tailed Community.

## Contribuer

Les contributions sont les bienvenues ! Consultez le [guide de contribution](CONTRIBUTING.md) pour commencer.

- 🐛 [Signaler un bug](../../issues/new?template=bug_report.md)
- 💡 [Proposer une fonctionnalité](../../issues/new?template=feature_request.md)
- 📖 [Code de conduite](CODE_OF_CONDUCT.md)
- 🔒 [Politique de sécurité](SECURITY.md)

---

<p align="center">
  Fait avec ❤️ au Québec par <a href="https://github.com/tailed-community">Tailed Community</a><br/>
  <sub>Essence QC · Prix essence Québec · Gas prices Quebec · Station-service · Carburant · Régie de l'énergie</sub>
</p>
