# Architecture de CampusEats

## Vue d'ensemble

CampusEats est une application full-stack organisée en deux parties distinctes :

- **Frontend** : application React Native / Expo tournant sur iOS, Android et Web
- **Backend** : API REST Django contenerisée avec Docker Compose

```
┌─────────────────────────────────────────────────────────────┐
│                     Clients                                  │
│   iOS (Expo Go)    Android (Expo Go)    Web (Nginx)         │
└────────────┬───────────────┬───────────────┬────────────────┘
             │               │               │
             └───────────────┴───────────────┘
                             │ HTTP / REST + JWT
                             ▼
             ┌───────────────────────────────┐
             │         Gunicorn :8000        │
             │     Django REST Framework     │
             │  (apps/accounts + content)    │
             └───────┬───────────────┬───────┘
                     │               │
            ┌────────▼───┐    ┌──────▼──────┐
            │ PostgreSQL │    │   Redis     │
            │     :5432  │    │   :6379     │
            └────────────┘    └─────────────┘
                     │
            ┌────────▼────────────────────┐
            │  Volume Docker media_data   │
            │  (fichiers vidéos uploadés) │
            └─────────────────────────────┘
```

---

## Frontend

### Technologies
- **Expo SDK 54** + **React Native 0.81.4**
- **expo-router 6** — navigation basée sur le système de fichiers
- **expo-video** — lecteur vidéo natif (AVPlayer sur iOS, ExoPlayer sur Android)
- **expo-image-picker** — accès galerie et caméra
- **TypeScript** — typage strict sur tous les fichiers
- **lucide-react-native** — icônes vectorielles

### Structure des écrans

```
app/
├── index.tsx               Redirection vers (tabs) ou auth/login
├── _layout.tsx             Layout racine (AuthContext, polices)
├── +not-found.tsx          Page 404
├── (tabs)/
│   ├── _layout.tsx         Barre de navigation → Accueil / Découvrir / Publier / Profil
│   ├── index.tsx           Fil d'actualité (FlatList verticale, plein écran)
│   ├── discover.tsx        Liste des restaurants (recherche + filtre cuisine)
│   ├── upload.tsx          Formulaire de publication de vidéo
│   └── profile.tsx         Profil utilisateur + grille de vidéos
├── auth/
│   ├── login.tsx           Formulaire de connexion
│   └── signup.tsx          Formulaire d'inscription
└── restaurant/
    └── [id].tsx            Page détail d'un restaurant (avis, formulaire)
```

### Composants

| Composant | Rôle |
|---|---|
| `VideoCard` | Affiche une vidéo en plein écran avec actions (like, commentaire, partage, muet). Gère la lecture auto, pause/play au tap, indicateur visuel. Utilise `useVideoPlayer` d'expo-video et `useEvent` pour les changements de statut. |
| `CommentsModal` | Bottom sheet de commentaires. `KeyboardAvoidingView` enveloppe tout le backdrop. `minHeight: 380` pour éviter un affichage vide. Zone transparente cliquable pour fermer. |

### Gestion de l'état

- **AuthContext** — stocke l'utilisateur courant et les tokens JWT. Persistance via `localStorage` (web) / `AsyncStorage` (native).
- **État local** (`useState`) — utilisé dans chaque écran pour les données chargées depuis l'API.
- **useFocusEffect** — recharge le fil à chaque retour sur l'onglet Accueil.

### Client API (`lib/api.ts`)

Fichier centralisé qui expose toutes les fonctions d'appel HTTP. Il gère :
- Ajout automatique du header `Authorization: Bearer <token>`
- Détection du format vidéo (`.mov` → `video/quicktime` pour iOS)
- Construction des URLs absolues pour les médias

---

## Backend

### Technologies
- **Django 4.2** + **Django REST Framework 3.15**
- **SimpleJWT 5.3** — authentification par tokens JWT (access + refresh)
- **django-cors-headers** — CORS configurable par variable d'environnement
- **Gunicorn 23** — serveur WSGI multi-workers (requis pour HTTP Range)
- **psycopg2** — driver PostgreSQL natif

### Applications Django

```
backend/apps/
├── accounts/       Gestion des utilisateurs
│   ├── models.py   Modèle User étendu avec profil (full_name, avatar_url, campus_location)
│   ├── views.py    RegisterView, LoginView, LogoutView, MeView
│   ├── serializers.py
│   └── urls.py     /api/auth/...
└── content/        Contenu principal
    ├── models.py   Video, Restaurant, Review, Comment, Like, SavedPlace
    ├── views.py    FeedView, VideoListCreateView, VideoDeleteView, LikeView...
    ├── serializers.py
    └── urls.py     /api/videos/... /api/restaurants/...
```

### Modèles de données

```
User (AbstractUser)
 ├── full_name
 ├── avatar_url
 ├── bio
 └── campus_location

Video
 ├── id (UUID)
 ├── user → User
 ├── video_file (FileField)
 ├── caption
 ├── tags (JSONField)
 ├── is_food_hack
 ├── duration
 ├── likes_count
 ├── comments_count
 └── created_at

Restaurant
 ├── id (UUID)
 ├── name
 ├── cuisine_type
 ├── description
 ├── address
 ├── photo_url
 ├── price_range (1–4)
 ├── average_rating
 └── total_reviews

Review
 ├── restaurant → Restaurant
 ├── user → User
 ├── rating (1–5)
 └── comment

Comment
 ├── video → Video
 ├── user → User
 └── text

Like
 ├── video → Video
 └── user → User

SavedPlace
 ├── restaurant → Restaurant
 └── user → User
```

### Serveur de médias avec HTTP Range

Le lecteur natif iOS (**AVPlayer**) exige le support des requêtes `Range: bytes=X-Y` (HTTP 206) pour la lecture en streaming. Le serveur de développement Django (`runserver`) ne les supporte pas.

Solution mise en place dans `backend/campuseats/urls.py` :

```python
def serve_media(request, path):
    # Protection traversée de chemin via os.path.realpath()
    # Lecture de l'en-tête Range:
    #   → HTTP 206 Partial Content avec Content-Range
    # Sinon :
    #   → HTTP 200 avec Accept-Ranges: bytes + Content-Length
```

**Gunicorn** est utilisé à la place de `runserver` car il sert les réponses avec les bons en-têtes.

---

## Infrastructure Docker

### Services (`docker-compose.yml`)

| Service | Image | Port | Rôle |
|---|---|---|---|
| `db` | postgres:16-alpine | 5432 (interne) | Base de données PostgreSQL |
| `redis` | redis:7-alpine | 6379 | Cache / sessions (prévu pour futures fonctionnalités) |
| `minio` | minio/minio | 9000, 9001 | Stockage objet S3 (désactivé en dev, actif en prod) |
| `backend` | build local | 8000 | API Django + Gunicorn |
| `frontend` | build local | 3000 | Build Expo Web servi par Nginx |

### Volumes persistants

| Volume | Contenu |
|---|---|
| `postgres_data` | Données PostgreSQL |
| `minio_data` | Objets MinIO |
| `media_data` | Fichiers vidéos uploadés (dev local) |

### Stockage des médias

En **développement** : stockage fichiers local dans le volume `media_data`, monté sur `/app/media` dans le conteneur backend. Les MINIO_* vars sont commentées.

En **production** (`docker-compose.prod.yml`) : MinIO S3-compatible remplace le stockage local. Le frontend accède aux médias via des URLs signées ou via Nginx.

### Ordre de démarrage

```
PostgreSQL (healthcheck pg_isready)
    └──▶ Backend (attend db healthy)
              └──▶ Frontend Nginx
Redis (indépendant)
MinIO (indépendant)
```

---

## Flux d'authentification

```
Client                          Backend
  │                               │
  ├── POST /api/auth/login/ ──────▶ Vérifie email + password
  │                               │ Crée access_token (5 min) + refresh_token (7 jours)
  │◀─── { access, refresh } ──────┤
  │                               │
  ├── GET /api/videos/feed/       │
  │   Authorization: Bearer <access> ──▶ Vérifie JWT → retourne le fil
  │                               │
  ├── POST /api/auth/token/refresh/ ──▶ Vérifie refresh_token
  │◀─── { access } ───────────────┤ Nouveau access_token
```

---

## Flux de publication d'une vidéo

```
Client (Expo)                    Backend
  │                               │
  ├── ImagePicker.launchLibraryAsync()
  │   (vidéo sélectionnée)        │
  │                               │
  ├── POST /api/videos/ ──────────▶ VideoListCreateView
  │   multipart/form-data          │ serializer.save(user=request.user)
  │   video_file, caption, tags   │ video_file stocké dans media_data
  │                               │ URL absolue construite avec request.build_absolute_uri()
  │◀─── { id, video_url, ... } ───┤
  │                               │
  ├── Redirection vers (tabs)     │
```

---

## Décisions techniques notables

| Problème | Solution choisie |
|---|---|
| iOS AVPlayer noir (pas de Range support) | Vue `serve_media` custom avec HTTP 206 + Gunicorn |
| Autoplay bloqué sur Web | Démarrage muet sur web (`Platform.OS === 'web'`), try/catch autour de `play()` |
| `play()` appelé avant le buffering | `useEvent(player, 'statusChange')` → play() uniquement quand `readyToPlay` |
| Pause/play utilisateur dans le fil | Référence `isPausedByUserRef` pour ne pas relancer automatiquement |
| MinIO bucket manquant en dev | MINIO_* vars commentées, stockage fichiers local à la place |
| `source='user_id'` redondant DRF | Suppression de l'argument `source=` dans les serializers |
