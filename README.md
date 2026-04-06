# 🍕 CampusEats

**CampusEats** est une application mobile et web destinée aux étudiants pour découvrir, partager et noter les restaurants proches de leur campus — à la manière d'un TikTok culinaire.

---

## Aperçu

| Fil d'actualité | Découvrir | Détail restaurant | Profil |
|---|---|---|---|
| Vidéos en plein écran, swipe vertical | Liste + recherche + filtres | Avis, notes, adresse | Grille de vidéos, suppression |

---

## Fonctionnalités

- **Fil de vidéos** — lecture automatique, pause/play au tap, son coupé/activé, badge "Astuce Culinaire"
- **Découvrir** — liste de restaurants avec recherche textuelle, filtre par type de cuisine, note moyenne et gamme de prix en €
- **Détail restaurant** — photo, description, adresse, galerie d'avis avec étoiles, formulaire d'avis
- **Publier** — sélection depuis la galerie ou enregistrement caméra, légende, tags, food hack toggle
- **Profil** — grille 3 colonnes de ses propres vidéos, lecture plein écran, suppression avec confirmation
- **Commentaires** — bottom sheet avec clavier adaptatif, liste et saisie en temps réel
- **Authentification** — inscription, connexion, tokens JWT avec rafraîchissement automatique
- **Interface entièrement en français**

---

## Stack technique

### Frontend
| Technologie | Version | Rôle |
|---|---|---|
| Expo | 54.0.10 | Framework React Native |
| React Native | 0.81.4 | Rendu mobile iOS / Android |
| expo-router | 6.0.8 | Navigation fichier-based |
| expo-video | — | Lecteur vidéo natif |
| expo-image-picker | — | Sélection / capture vidéo |
| lucide-react-native | — | Icônes |
| TypeScript | — | Typage statique |

### Backend
| Technologie | Version | Rôle |
|---|---|---|
| Django | 4.2.16 | Framework web Python |
| Django REST Framework | 3.15.2 | API REST |
| SimpleJWT | 5.3.1 | Authentification JWT |
| django-cors-headers | 4.4.0 | CORS |
| Gunicorn | 23.0.0 | Serveur WSGI (HTTP Range support) |
| psycopg2 | 2.9.10 | Driver PostgreSQL |

### Infrastructure
| Service | Image | Rôle |
|---|---|---|
| PostgreSQL | 16-alpine | Base de données principale |
| Redis | 7-alpine | Cache / sessions |
| MinIO | latest | Stockage objet S3 (désactivé en dev) |
| Nginx | alpine | Reverse proxy + serveur web |
| Docker Compose | — | Orchestration locale |

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x
- [Node.js](https://nodejs.org/) ≥ 20
- [Expo Go](https://expo.dev/go) sur iOS ou Android (pour tester sur appareil)

---

## Installation et démarrage

### 1. Cloner le dépôt

```bash
git clone https://github.com/ayinin-cherifdine/campuseats.git
cd campuseats
```

### 2. Configurer les variables d'environnement

```bash
# Frontend
cp .env.example .env
# Modifier EXPO_PUBLIC_API_URL avec l'IP LAN de votre machine (pour Expo Go sur appareil)
# Exemple : EXPO_PUBLIC_API_URL=http://192.168.1.10:8000

# Backend
cp backend/.env.example backend/.env
```

### 3. Démarrer le backend avec Docker

```bash
docker compose up -d
```

Les services démarrent dans cet ordre : PostgreSQL → Redis → Backend → Frontend (Nginx).

### 4. Appliquer les migrations et seeder les données

```bash
# Migrations
docker exec campuseats-backend-1 python manage.py migrate

# Données de démonstration (10 restaurants)
docker exec campuseats-backend-1 python manage.py seed_demo_data
```

### 5. Démarrer le frontend Expo

```bash
npm install
npx expo start
```

- Appuyer sur `i` pour l'émulateur iOS
- Appuyer sur `a` pour l'émulateur Android
- Scanner le QR code avec Expo Go pour un appareil physique

---

## Structure du projet

```
campuseats/
├── app/                        # Écrans Expo Router
│   ├── (tabs)/                 # Navigation par onglets
│   │   ├── index.tsx           # Fil d'actualité
│   │   ├── discover.tsx        # Découvrir les restaurants
│   │   ├── upload.tsx          # Publier une vidéo
│   │   └── profile.tsx         # Profil utilisateur
│   ├── auth/                   # Authentification
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── restaurant/
│       └── [id].tsx            # Détail d'un restaurant
├── components/                 # Composants réutilisables
│   ├── VideoCard.tsx           # Carte vidéo TikTok-style
│   └── CommentsModal.tsx       # Bottom sheet commentaires
├── contexts/
│   └── AuthContext.tsx         # Contexte d'authentification
├── lib/
│   └── api.ts                  # Client API centralisé
├── types/
│   └── database.ts             # Types TypeScript
├── backend/                    # API Django
│   ├── apps/
│   │   ├── accounts/           # Auth, profils utilisateurs
│   │   └── content/            # Vidéos, restaurants, avis, commentaires
│   ├── campuseats/
│   │   ├── settings.py
│   │   └── urls.py             # Routes + serve_media (HTTP Range)
│   └── requirements.txt
├── docs/                       # Documentation technique
│   └── architecture.md
├── docker-compose.yml          # Dev local
├── docker-compose.prod.yml     # Production
└── nginx/
    └── nginx.conf
```

---

## API — Endpoints principaux

### Authentification (`/api/auth/`)
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register/` | Créer un compte |
| POST | `/api/auth/login/` | Connexion → tokens JWT |
| POST | `/api/auth/logout/` | Déconnexion (blacklist token) |
| POST | `/api/auth/token/refresh/` | Rafraîchir le token |
| GET/PATCH | `/api/auth/me/` | Profil courant |

### Vidéos (`/api/videos/`)
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/videos/feed/` | Fil d'actualité |
| POST | `/api/videos/` | Publier une vidéo |
| DELETE | `/api/videos/<id>/` | Supprimer (propriétaire seulement) |
| POST | `/api/videos/<id>/like/` | Liker / unliker |
| GET/POST | `/api/videos/<id>/comments/` | Commentaires |

### Restaurants (`/api/restaurants/`)
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/restaurants/` | Liste (+ recherche + filtre) |
| GET | `/api/restaurants/<id>/` | Détail |
| POST | `/api/restaurants/<id>/save/` | Sauvegarder / retirer |
| GET/POST | `/api/restaurants/<id>/reviews/` | Avis |

---

## Développement

### Accéder aux services
| Service | URL |
|---|---|
| API Django | http://localhost:8000 |
| Admin Django | http://localhost:8000/admin |
| Frontend web (Nginx) | http://localhost:3000 |
| MinIO console | http://localhost:9001 |

### Commandes utiles

```bash
# Voir les logs du backend en temps réel
docker compose logs -f backend

# Ouvrir un shell Django
docker exec -it campuseats-backend-1 python manage.py shell

# Accéder à PostgreSQL
docker exec -it campuseats-db-1 psql -U campuseats -d campuseats

# Reconstruire l'image backend après modification du Dockerfile
docker compose up -d --build backend
```

---

## Auteur

**Ayinin Cherifdine** — [github.com/ayinin-cherifdine](https://github.com/ayinin-cherifdine)
