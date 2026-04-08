import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    Modèle utilisateur personnalisé qui fusionne l'authentification et le profil
    dans une seule table (plus simple qu'une table séparée UserProfile).
    L'email remplace le nom d'utilisateur comme identifiant de connexion.
    """
    # UUID comme clé primaire → plus sécurisé que les entiers auto-incrémentés
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    # Champs de profil affichés dans l'application
    full_name = models.CharField(max_length=200, default='', blank=True)
    avatar_url = models.TextField(default='', blank=True)   # URL de la photo de profil
    bio = models.TextField(default='', blank=True)          # Biographie courte
    campus_location = models.CharField(max_length=200, default='', blank=True)
    followers_count = models.IntegerField(default=0)        # Mis à jour côté application
    following_count = models.IntegerField(default=0)

    # Note : created_at provient du champ date_joined d'AbstractUser.
    # Il est exposé sous le nom created_at dans le sérialiseur ProfileSerializer.

    USERNAME_FIELD = 'email'       # Django utilise l'email pour l'authentification
    REQUIRED_FIELDS = ['username'] # username reste obligatoire (héritage AbstractUser)

    class Meta:
        pass  # Nom de table par défaut : accounts_user

    def __str__(self):
        return self.email
