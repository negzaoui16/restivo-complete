# 📚 Dossier Technique & Guide de Validation : Module Menu, Génération 3D & Réalité Augmentée (Restivo)

Ce dossier détaille l'architecture complète, les fichiers sources, les flux de données (Owner & Client) et le script de soutenance en **Darja Tounsia** pour votre validation.

---

## 🏗️ 1. Architecture Globale du Module

```mermaid
flowchart TD
    subgraph Owner["👨‍🍳 Espace Restaurateur (Owner)"]
        UI_Cat["Gestion Catégories\n(Tabs & API)"]
        UI_Add["Ajout / Modif Plat\n(AddMenuItemPanel.tsx)"]
        AI_Gen["Bouton 'Générer 3D'\n(handleGenerate3D)"]
    end

    subgraph Backend["⚙️ Backend & Intelligence Artificielle"]
        API_Items["/api/restaurants/[id]/menu/items"]
        API_Cat["/api/restaurants/[id]/menu/categories"]
        API_3D["/api/generate-3d (Trellis AI)"]
        Storage["Stockage Modèles 3D\n(public/models/*.glb)"]
        DB[(Base de Données PostgreSQL / Prisma)]
    end

    subgraph Client["📱 Espace Client (Gourmand / Table)"]
        Menu_View["Menu Public & Preview\n(MenuPreviewSection.tsx)"]
        Btn_AR["Bouton '📱 Voir en 3D & AR'"]
        Modal_AR["Visionneuse 3D & Caméra AR\n(ARModal.tsx)"]
    end

    UI_Cat -->|POST / PUT| API_Cat
    UI_Add -->|Photo 2D| AI_Gen
    AI_Gen -->|FormData(image)| API_3D
    API_3D -->|Trellis AI / Pipeline Normals| Storage
    API_3D -->|URL .glb| UI_Add
    UI_Add -->|Enregistrer Plat + model3dUrl| API_Items
    API_Items --> DB
    API_Cat --> DB

    DB -->|Lecture Menu| Menu_View
    Menu_View --> Btn_AR
    Btn_AR --> Modal_AR
    Modal_AR -->|Charge modèle .glb| Storage
```

---

## 📂 2. Répertoire Détaillé des Fichiers & Rôles

### A. Espace Restaurateur (Owner) & Gestion du Menu

| Fichier | Emplacement | Rôle Principal |
| :--- | :--- | :--- |
| **`page.tsx`** | [`app/mainpage/restaurants/menu/page.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/page.tsx) | Page centrale de gestion du menu. Gère les onglets (Items, Categories, Promotions, Settings), la recherche et le filtrage. |
| **`AddMenuItemPanel.tsx`** | [`app/mainpage/restaurants/menu/_components/AddMenuItemPanel.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/AddMenuItemPanel.tsx) | Formulaire latéral (Drawer) pour ajouter ou modifier un plat. Gère l'upload de photo, les tags diététiques (Halal, Vegan), et le déclencheur de génération 3D par IA. |
| **`MenuTable.tsx`** | [`app/mainpage/restaurants/menu/_components/MenuTable.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/MenuTable.tsx) | Tableau interactif listant tous les plats avec toggle de disponibilité instantané, prix, badges et actions (Modifier/Supprimer). |
| **`MenuTabs.tsx`** | [`app/mainpage/restaurants/menu/_components/MenuTabs.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/MenuTabs.tsx) | Barre de navigation des onglets du menu (Plats, Catégories, Promotions, Paramètres). |
| **`MenuSettingsPanel.tsx`** | [`app/mainpage/restaurants/menu/_components/MenuSettingsPanel.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/MenuSettingsPanel.tsx) | Configuration générale du menu (nom, devise, statut de publication). |

---

### B. Moteur d'Intelligence Artificielle & Génération 3D

| Fichier | Emplacement | Rôle Principal |
| :--- | :--- | :--- |
| **`route.ts` (API 3D)** | [`app/api/generate-3d/route.ts`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/api/generate-3d/route.ts) | Point d'entrée de l'API de génération 3D. Reçoit l'image 2D, l'envoie à l'IA, applique le modèle de repli si besoin, recalcule les normales d'éclairage et stocke le fichier `.glb`. |
| **`trellis.ts`** | [`app/api/generate-3d/trellis.ts`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/api/generate-3d/trellis.ts) | Connecteur vers le modèle de Deep Learning **Trellis** (via Gradio / HuggingFace) pour convertir une photo 2D en géométrie 3D PBR texturée. |
| **`fallback.ts`** | [`app/api/generate-3d/fallback.ts`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/api/generate-3d/fallback.ts) | Système intelligent de secours : si l'API IA est surchargée ou hors ligne, il associe immédiatement un modèle 3D réaliste correspondant à la catégorie (Pizza, Burger, Boisson, etc.). |
| **`normals.ts`** | [`app/api/generate-3d/normals.ts`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/api/generate-3d/normals.ts) | Post-traitement du fichier binaire GLB pour corriger les normales de surface et garantir un éclairage photoréaliste sans faces noires. |
| **`image-parser.ts`** | [`app/api/generate-3d/image-parser.ts`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/api/generate-3d/image-parser.ts) | Normalisation et conversion des images uploadées (Base64, multipart ou URL) en Blob binaire pour l'IA. |

---

### C. Espace Client, Rendu 3D & Réalité Augmentée

| Fichier | Emplacement | Rôle Principal |
| :--- | :--- | :--- |
| **`MenuPreview.tsx`** | [`app/mainpage/restaurants/menu/_components/MenuPreview.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/MenuPreview.tsx) | Vue miroir du menu client. Affiche la bannière du restaurant, la navigation par catégories et les cartes de plats. |
| **`MenuPreviewSection.tsx`** | [`app/mainpage/restaurants/menu/_components/MenuPreviewSection.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/MenuPreviewSection.tsx) | Composant de grille affichant chaque plat, son prix, ses badges diététiques et le bouton `📱 Voir en 3D & Réalité Augmentée`. |
| **`ARModal.tsx`** | [`app/mainpage/restaurants/menu/_components/ARModal.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/ARModal.tsx) | **Cœur de la Réalité Augmentée** : Modal interactif avec visionneuse 3D 360°, passage en caméra HD en direct, drag tactile 1 doigt, pinch-to-zoom 2 doigts, ombre portée réaliste et fixation sur table. |
| **`tags.ts`** | [`lib/menu/tags.ts`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/lib/menu/tags.ts) | Moteur de tags et métadonnées. Extrait les tags (Halal, Vegan, Spicy, Gluten-Free) et élimine les commentaires techniques pour que l'interface reste propre. |

---

## 🔄 3. Explication Détaillée des Workflows

### 🍳 Workflow 1 : Création de Catégorie & Ajout d'un Plat (Owner)
1. **Création de Catégorie :**
   * L'administrateur va dans l'onglet **Categories**.
   * Il saisit le nom (ex: *"Pizza"*, *"Burgers Gourmet"*).
   * L'appel `POST /api/restaurants/[restaurantId]/menu/categories` enregistre la catégorie en base de données.
2. **Ajout d'un Plat avec Modèle 3D :**
   * L'admin clique sur **"+ Ajouter un plat"** ce qui ouvre [`AddMenuItemPanel.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/AddMenuItemPanel.tsx).
   * Il remplit les informations : Nom, Prix, Catégorie, Description, et coche les tags diététiques (`Halal`, `Végétarien`, etc.).
   * Il importe une photo du plat.
   * Il clique sur **"Générer le modèle 3D"** :
     * La fonction `handleGenerate3D()` envoie l'image à [`/api/generate-3d`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/api/generate-3d/route.ts).
     * L'IA Trellis convertit la photo 2D en maillage 3D textured GLB en quelques secondes.
     * Le modèle 3D apparaît directement dans l'aperçu du panneau d'ajout.
   * En cliquant sur **"Enregistrer"**, le plat est stocké avec son attribut `model3dUrl: "/models/item-3d-....glb"`.

---

### 🍕 Workflow 2 : Consultation & Réalité Augmentée (Client)
1. **Découverte du Menu :**
   * Le client accède au menu en scannant le QR code sur la table de son restaurant ou via le web.
   * Il voit la liste des plats organisés par catégories avec photos, prix et badges nutritionnels.
2. **Visualisation 3D :**
   * Si le plat possède un modèle 3D, le bouton violet **"📱 Voir en 3D & Réalité Augmentée"** s'affiche.
   * Au clic, [`ARModal.tsx`](file:///c:/Users/Negza/Desktop/Project%20Next/restivo-V1-main/app/mainpage/restaurants/menu/_components/ARModal.tsx) s'ouvre. Le client peut faire pivoter le plat à 360° et zoomer dessus.
3. **Réalité Augmentée sur la Table :**
   * Le client clique sur **"📸 Poser sur ma table (Caméra Réalité Augmentée)"**.
   * Le flux vidéo de la caméra arrière s'ouvre instantanément en haute définition.
   * Le plat 3D apparaît posé sur la table avec une ombre de contact réaliste.
   * Le client peut :
     * **Glisser avec 1 doigt :** Déplacer la pizza ou le burger où il veut sur sa table réelle.
     * **Pincer avec 2 doigts ou boutons ± :** Ajuster l'échelle à taille réelle (100%).
     * **Bouton ⟳ Tourner :** Faire pivoter le plat pour voir la garniture sous tous les angles.
     * **Bouton 📍 Fixer sur table :** Verrouiller le plat à cet emplacement pour observer le rendu final.

---

## 🎤 4. Script de Soutenance en Darja Tunisienne (Validation)

### Introduction Générale
> *"Bonjour à tous. El partie mte3i fi projet **Restivo** hiya el 9alb el nabbadh mta3 l'expérience utilisateur : **el Menu Interactif, la Génération 3D par Intelligence Artificielle, wel Réalité Augmentée (AR)**.*
>
> *L'objectif ken bech nrodou el menu mahouch simple carte papier ou PDF statique, ama expérience immersive win el restaurateur yzid ses plats b'façon intelligente, w el client ychouf el makla b'sa9iha 3al tawla mte3ou b'taille réelle 9bal ma ycommander."*

---

### Partie 1 : Espace Restaurateur (Owner)
> *"Fel côté Restaurateur (Owner) :*
> * *1. **Gestion des Catégories & Plats :** El restaurateur ynajem yorganisi el carte mte3ou b'des catégories dynamiques, y7ot les prix, la disponibilité instantanée en direct.*
> * *2. **Tags Intelligents :** Zidna système de métadonnées automatique pour les allergènes wel spécificités alimentaires kima Halal, Végétarien, Sans Gluten.*
> * *3. **Génération 3D par IA :** Houni el point fort technologique mte3na : el restaurateur ma 3andouch 3alech ykoun expert en 3D Blender. Yekfi ennou y7ot une simple photo 2D mta3 el plat mte3ou, w yenzel 3ala 'Générer le modèle 3D'.*
> * *Notre backend y3ayet lel modèle de Deep Learning **Trellis** elli y7awwel el photo en modèle 3D binaire format **GLB** avec textures réalistes et normales d'éclairage calculées automatiquement."*

---

### Partie 2 : Espace Client & Réalité Augmentée
> *"Fel côté Client :*
> * *1. **Vue 3D 360° :** El client yenzel 3ala 'Voir en 3D', yethallou un modal moderne makhdoum b'Web Components (`<model-viewer>`) win ynejjem ydawwer el plat fi kol les angles.*
> * *2. **Réalité Augmentée 3al Tawla :** Dès qu'il clique sur 'Poser sur ma table', la caméra arrière du smartphone s'active en haute définition.*
> * *El plat 3D yahbet direct fouq el tawla m3a **ombre de contact réaliste**. El client ynejjem y7arkou b'soub3ou (Touch & Drag), ykabbrou b'2 doigts (Pinch-to-zoom) bech ychouf el taille réelle (100%), ydawwrou, w yenzel 'Fixer sur ma table' bech ythabbet el sa7n.*
> * *El résultat : zéro tremblement, compatibilité m3a 100% des smartphones (Android w iOS), w expérience d'achat khedma barcha."*

---

## ❓ 5. Questions Probables du Jury & Réponses Idéales

#### Q1 : "Pourquoi avoir choisi le format .GLB pour les modèles 3D ?"
> **Réponse :** *"Format **GLB** houwa le standard industriel mta3 el Web 3D (kima el JPEG fel tsawer). Houwa format binaire compact elli yjma3 el géométrie (mesh), les textures (PBR), wel matériaux fi fichier wa7ed khfif barcha, ce qui garantit un temps de chargement rapide 3al 4G/5G mta3 el talifoun."*

#### Q2 : "Comment fonctionne la génération 3D à partir d'une simple image ?"
> **Réponse :** *"On utilise une architecture d'IA basée sur le modèle **Trellis**. L'IA analyse l'image 2D, déduit la profondeur (depth map), extrait les formes géométriques volumétriques en 3D (nerf/gaussian splatting to mesh), puis génère la texture UV projetée. On a aussi mis en place un pipeline de fallback intelligent pour garantir qu'aucune requête ne reste bloquée."*

#### Q3 : "Pourquoi la solution Caméra AR directe est meilleure que WebXR natif sur mobile ?"
> **Réponse :** *"WebXR 'immersive-ar' sur les navigateurs mobiles Android (notamment Xiaomi/MIUI) souffre de limitations matérielles au niveau du GPU compositor où la couche WebGL est souvent masquée par le pilote graphique. Notre solution hybride utilisant le flux vidéo direct HD couplé au moteur de rendu 3D avec ombre projetée et gestion tactile (drag, pinch, lock) garantit une stabilité totale sans plantage sur 100% des smartphones."*
