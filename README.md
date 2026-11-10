# Restivo - Plateforme Intelligente de Gestion de Restaurant

> **Restivo** est une plateforme SaaS complète de gestion de restaurant de nouvelle génération développée avec **Next.js 16**, intégrant un **Menu 3D interactif avec Réalité Augmentée (WebAR)**, un **Assistant Chef Culinaire IA**, et un module avancé d'**Analytics & Prédictions ML de la Demande**.

---

## 🌟 Fonctionnalités Clés

### 1. 🍽️ Menu 3D & Réalité Augmentée (WebAR) — 100% Hors-Ligne
- **Visualisation 3D Interactive** : Rendu temps réel des plats avec Google `<model-viewer>` embarqué localement (`/vendor/model-viewer.min.js`).
- **WebAR sur Smartphone** : Projection directe des plats dans l'espace réel à l'échelle **1:1 en centimètres** (support natif Android *Scene Viewer* et iOS *AR Quick Look* via fichier USDZ/GLB).
- **Bibliothèque 3D Locale** : Presets 3D complets (`pizza.glb`, `burger.glb`, `drink.glb`, `salad.glb`...) disponibles sans connexion Internet.
- **Support 100% Hors-Ligne** : Service Worker PWA (`/sw.js`) et gestionnaire de cache (`CacheStorage`) pour pré-charger automatiquement les modèles 3D et les menus.

### 2. ✨ Assistant Chef IA Restivo (Création de Plats Intelligente)
- **Auto-Complétion IA** : Détection automatique de la catégorie, du prix réaliste en TND, de la description gourmande, des tags allergènes (Halal, Végétarien, Sans Gluten...) et association du modèle 3D adapté.
- **Tolérance aux Fautes & Dialecte Tunisien (Darja)** : Algorithme de distance de Levenshtein avec normalisation phonétique (`ma9aroun`, `ma9rouna`, `piza`, `coka`, `m9loub`).
- **Apprentissage Continu (Adaptive Learning)** : Le système mémorise les préférences et personnalisations du propriétaire pour améliorer ses futures suggestions.

### 3. 📈 Analytics & Prédictions de Demande Machine Learning
- **Modèle Prédictif ML** : Prédiction de l'affluence horaire, projection du chiffre d'affaires et simulation de l'impact météorologique (ensoleillé, pluvieux, froid).
- **Gestion des Stocks & Approvisionnement IA** : Recommandations automatiques de commandes fournisseurs calculées par le modèle de régression.
- **Performance Sub-seconde (0.2s)** : Requêtage batch optimisé et cache mémoire serveur (TTL 60s) avec Stale-While-Revalidate côté client.
- **Fonctionnement Hors-Ligne** : Sauvegarde et rechargement local immédiat avec synchronisation automatique au retour du réseau.

### 4. 🏢 Gestion de Restaurant & Opérations Complètes
- Gestion des tables, plans de salle (Floor Plan), réservations en temps réel.
- Prise de commandes (Live Orders) et interface de service pour le staff.
- Authentification sécurisée multi-rôles (Owner, Manager, Staff).

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+ ou 20+
- npm ou pnpm

### Installation

1. **Cloner le repository :**
   ```bash
   git clone https://github.com/negzaoui16/restivo-complete.git
   cd restivo-complete
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Variables d'environnement :**
   Copiez le fichier `.env.example` en `.env` :
   ```bash
   cp .env.example .env
   ```

4. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   L'application sera accessible sur [http://localhost:3000](http://localhost:3000) (ou `http://localhost:3001`).

---

## 🧪 Tests & Qualité Logicielle

Pour exécuter la suite de tests complète (199 tests unitaires et d'intégration) :
```bash
npm test
```
Tous les tests sont passés avec succès (**199/199 passing, 0 failure**).

---

## 🛠️ Stack Technique

- **Framework** : Next.js 16 (App Router), React 19, TypeScript
- **Styling** : Tailwind CSS, Lucide Icons
- **3D & AR** : Google `@google/model-viewer`, Three.js, WebXR / Scene Viewer / AR Quick Look
- **Machine Learning & IA** : Algorithmes ML de régression linéaire multiple, moteur NLP heuristique & Levenshtein
- **Offline & PWA** : Service Workers, CacheStorage API, localStorage synchronisé
- **Database** : MongoDB Atlas / Prisma ORM
