import uuid
from django.db import models
from django.conf import settings


class Restaurant(models.Model):
    """
    Représente un restaurant visible dans l'onglet Découvrir.
    Les restaurants sont créés manuellement (ou via Django Admin) et
    associés aux vidéos et aux avis des utilisateurs.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(default='', blank=True)
    address = models.CharField(max_length=500, default='', blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, default=0)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, default=0)
    cuisine_type = models.CharField(max_length=100, default='', blank=True)
    price_range = models.IntegerField(default=2)   # Échelle : 1=€  2=€€  3=€€€
    photo_url = models.TextField(default='', blank=True)
    # Noteé moyenne recalculée à chaque ajout d'avis (ReviewListCreateView)
    average_rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    total_reviews = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_restaurants'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-average_rating']  # Meilleurs restaurants en premier

    def __str__(self):
        return self.name


class Video(models.Model):
    """
    Représente une vidéo courte publiée par un utilisateur.
    Le fichier vidéo est stocké en local dans /app/media/videos/.
    video_url est utilisé comme fallback si aucun fichier n'est uploadé.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Lien vers l'auteur — si l'utilisateur est supprimé, ses vidéos aussi (CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='videos')
    # Lien vers le restaurant (optionnel)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.SET_NULL, null=True, blank=True)
    video_file = models.FileField(upload_to='videos/%Y/%m/%d/', null=True, blank=True)
    video_url = models.TextField(default='', blank=True)  # URL externe (fallback)
    thumbnail_url = models.TextField(default='', blank=True)
    caption = models.TextField(default='', blank=True)    # Légende de la vidéo
    tags = models.JSONField(default=list)                  # Ex. ["burger", "étudiant"]
    likes_count = models.IntegerField(default=0)
    comments_count = models.IntegerField(default=0)
    views_count = models.IntegerField(default=0)
    duration = models.IntegerField(default=0)              # Durée en secondes
    is_food_hack = models.BooleanField(default=False)     # Marquée "astuce culinaire"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # Dernières vidéos en premier

    @property
    def resolved_video_url(self):
        """
        Retourne l'URL finale de la vidéo :
        - video_file.url si un fichier a été uploadé (stockage local)
        - video_url sinon (URL externe)
        """
        if self.video_file:
            return self.video_file.url
        return self.video_url

    def __str__(self):
        return f"{self.user.username} — {self.caption[:40]}"


class Review(models.Model):
    """Avis déposé par un utilisateur sur un restaurant (note de 1 à 5)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField()  # Note de 1 à 5 étoiles
    comment = models.TextField(default='', blank=True)
    photos = models.JSONField(default=list)  # URLs des photos associées à l'avis
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} → {self.restaurant.name} ({self.rating}★)"


class Like(models.Model):
    """
    Enregistre qu'un utilisateur a aimé (♥) une vidéo.
    unique_together empêche de liker deux fois la même vidéo.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')  # Un seul like par (utilisateur, vidéo)


class Comment(models.Model):
    """Commentaire textuel laissé par un utilisateur sous une vidéo."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='video_comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']  # Commentaires les plus récents en premier


class Follow(models.Model):
    """
    Relation d'abonnement entre deux utilisateurs.
    follower suit following.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_following'
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_followers'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')  # On ne peut pas suivre deux fois


class SavedPlace(models.Model):
    """
    Enregistre qu'un utilisateur a mis un restaurant en favori.
    Afférent à la fonction "Sauvegarder" de la fiche restaurant.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'restaurant')  # Un seul favori par (utilisateur, restaurant)
