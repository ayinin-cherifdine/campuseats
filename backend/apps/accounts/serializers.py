from rest_framework import serializers
from .models import User


class ProfileSerializer(serializers.ModelSerializer):
    """Public profile fields returned on every authenticated response."""
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name',
            'avatar_url', 'bio', 'campus_location',
            'followers_count', 'following_count', 'created_at',
        ]
        read_only_fields = ['id', 'email', 'followers_count', 'following_count', 'created_at']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'full_name', 'avatar_url', 'bio', 'campus_location']
