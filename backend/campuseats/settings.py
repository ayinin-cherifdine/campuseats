"""
Configuration principale de Django pour CampusEats.
Les valeurs sensibles (SECRET_KEY, DB_PASSWORD…) sont lues depuis les variables
d'environnement (fichier .env chargé par Docker Compose ou le shell).
"""
import os
from pathlib import Path
from datetime import timedelta

# Chemin absolu vers la racine du projet Django (dossier backend/)
BASE_DIR = Path(__file__).resolve().parent.parent

# Clé secrète Django — NE JAMAIS utiliser la valeur par défaut en production
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-not-for-production')
# Mode debug : affiche les erreurs détaillées. Doit être False en production.
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
# Hôtes autorisés à accéder au serveur (ex. IP LAN du serveur de prod)
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    # Applications Django intégrées
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Bibliothèques tierces
    'rest_framework',               # Django REST Framework (DRF) : serializers, vues API
    'rest_framework_simplejwt',     # Authentification JWT (access + refresh tokens)
    'rest_framework_simplejwt.token_blacklist',  # Blacklist pour la déconnexion sécurisée
    'corsheaders',                  # CORS : autorise le frontend React Native à appeler l'API
    # Applications locales CampusEats
    'apps.accounts',                # Gestion des utilisateurs (modèle User, auth)
    'apps.content',                 # Vidéos, restaurants, commentaires, likes…
]

MIDDLEWARE = [
    # CorsMiddleware DOIT être en premier pour ajouter les en-têtes CORS à toutes les réponses
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise : sert les fichiers statiques (CSS Django Admin) sans Nginx en dev
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'campuseats.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'campuseats.wsgi.application'
ASGI_APPLICATION = 'campuseats.asgi.application'

# ── Base de données ──────────────────────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        # Toutes les valeurs lues depuis les variables d'environnement Docker
        'NAME': os.environ.get('DB_NAME', 'campuseats'),
        'USER': os.environ.get('DB_USER', 'campuseats'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'campuseats_secret'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# ── Modèle utilisateur personnalisé ────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.User'  # Utilise notre modèle User personnalisé (apps/accounts/models.py)

# ── Validateurs de mot de passe ─────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'   # Toutes les dates stockées en UTC dans la BDD
USE_I18N = True     # Activation des traductions Django
USE_TZ = True       # Dates avec fuseau horaire (timezone-aware)

# ── Fichiers statiques et média ────────────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'  # Dossier collecté par collectstatic pour Django Admin

# Stockage des fichiers média (vidéos uploadées)
# Si MINIO_ENDPOINT est défini → stockage S3 (MinIO) ; sinon → stockage local dans /app/media
_minio_endpoint = os.environ.get('MINIO_ENDPOINT')
if _minio_endpoint:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.environ.get('MINIO_ACCESS_KEY', 'campuseats')
    AWS_SECRET_ACCESS_KEY = os.environ.get('MINIO_SECRET_KEY', 'campuseats_minio_secret')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'campuseats-media')
    AWS_S3_ENDPOINT_URL = f'http://{_minio_endpoint}'
    AWS_S3_URL_PROTOCOL = 'http:'
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = 'public-read'
    MEDIA_URL = f'http://{_minio_endpoint}/{AWS_STORAGE_BUCKET_NAME}/'
else:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'

# ── Django REST Framework (DRF) ──────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        # Toutes les requêtes doivent porter un header "Authorization: Bearer <access_token>"
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        # Par défaut, tous les endpoints nécessitent une authentification
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,  # 20 éléments par page (ex. fil vidéo)
}

# ── Configuration JWT (SimpleJWT) ────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),   # Token d'accès valide 1 heure
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),  # Token de rafraîchissement valide 14 jours
    'ROTATE_REFRESH_TOKENS': True,    # Émet un nouveau refresh token à chaque rafraîchissement
    'BLACKLIST_AFTER_ROTATION': True, # Invalide l'ancien refresh token après rotation
    'UPDATE_LAST_LOGIN': True,        # Met à jour last_login à chaque connexion
}

# ── CORS (Cross-Origin Resource Sharing) ─────────────────────────────────────
# Origines autorisées à appeler l'API (navigateur web + Expo DevTools)
_cors_origins = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:8081,http://localhost:19006'
)
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'  # Entier 64 bits comme clé primaire par défaut
