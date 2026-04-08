from rest_framework import serializers
from apps.accounts.serializers import ProfileSerializer
from .models import Restaurant, Video, Review, Like, Comment


class RestaurantSerializer(serializers.ModelSerializer):
    """Sérialise toutes les données d'un restaurant pour l'API."""
    created_by = serializers.UUIDField(source='created_by_id', allow_null=True, read_only=True)
    # On force les décimaux en float pour que le front JavaScript puisse utiliser .toFixed()
    average_rating = serializers.FloatField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    class Meta:
        model = Restaurant
        fields = [
            'id', 'name', 'description', 'address',
            'latitude', 'longitude', 'cuisine_type', 'price_range',
            'photo_url', 'average_rating', 'total_reviews',
            'created_by', 'created_at',
        ]


class VideoSerializer(serializers.ModelSerializer):
    """
    Sérialise une vidéo de base (utilisé pour la liste des vidéos d'un utilisateur).
    La méthode get_video_url construit l'URL absolue pour que le mobile puisse
    télécharger le fichier même depuis un réseau différent.
    """
    user_id = serializers.UUIDField(read_only=True)
    restaurant_id = serializers.UUIDField(allow_null=True, read_only=True)
    video_url = serializers.SerializerMethodField()

    def get_video_url(self, obj):
        """
        Retourne l'URL absolue de la vidéo (ex. http://192.168.1.39:8000/media/video.mp4).
        Sans cela, les chemins relatifs (/media/...) ne fonctionnent pas sur mobile.
        """
        url = obj.resolved_video_url
        request = self.context.get('request')
        if request and url and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url

    class Meta:
        model = Video
        fields = [
            'id', 'user_id', 'restaurant_id', 'video_url', 'thumbnail_url',
            'caption', 'tags', 'likes_count', 'comments_count', 'views_count',
            'duration', 'is_food_hack', 'created_at',
        ]


class VideoFeedSerializer(VideoSerializer):
    """
    Étend VideoSerializer avec le profil de l'auteur, le restaurant associé
    et le booléen is_liked (vrai si l'utilisateur courant a aimé la vidéo).
    Utilisé uniquement pour le fil d'actualité (FeedView).
    """
    profile = ProfileSerializer(source='user', read_only=True)
    restaurant = RestaurantSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()

    def get_is_liked(self, obj):
        # liked_video_ids est passé dans le contexte par FeedView pour éviter N+1 requêtes
        return obj.id in self.context.get('liked_video_ids', set())

    class Meta(VideoSerializer.Meta):
        fields = VideoSerializer.Meta.fields + ['profile', 'restaurant', 'is_liked']


class ReviewSerializer(serializers.ModelSerializer):
    """Sérialise un avis utilisateur (note + commentaire)."""
    user_id = serializers.UUIDField(read_only=True)
    restaurant_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user_id', 'restaurant_id', 'rating', 'comment', 'photos', 'created_at']


class CommentSerializer(serializers.ModelSerializer):
    """Sérialise un commentaire de vidéo avec le profil de l'auteur."""
    user_id = serializers.UUIDField(read_only=True)
    profile = ProfileSerializer(source='user', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user_id', 'video', 'text', 'profile', 'created_at']
