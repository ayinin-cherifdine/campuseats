from rest_framework import serializers
from .models import User


class ProfileSerializer(serializers.ModelSerializer):
    """
    Champs de profil publics renvoyés dans toutes les réponses authentifiées.
    Utilisé à la fois pour /api/auth/me/ et dans VideoFeedSerializer (profil de l'auteur).
    """
    # Renomme date_joined (Django interne) en created_at (convention API)
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name',
            'avatar_url', 'bio', 'campus_location',
            'followers_count', 'following_count', 'created_at',
        ]
        # Ces champs ne peuvent pas être modifiés via l'API
        read_only_fields = ['id', 'email', 'followers_count', 'following_count', 'created_at']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Champs modifiables par l'utilisateur via PATCH /api/auth/me/."""
    class Meta:
        model = User
        fields = ['username', 'full_name', 'avatar_url', 'bio', 'campus_location']
