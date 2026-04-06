import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    Custom user model that merges auth + profile fields into one table.
    Uses email as the login field instead of username.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    # Profile fields
    full_name = models.CharField(max_length=200, default='', blank=True)
    avatar_url = models.TextField(default='', blank=True)
    bio = models.TextField(default='', blank=True)
    campus_location = models.CharField(max_length=200, default='', blank=True)
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)

    # created_at comes from AbstractUser's date_joined — we expose it as created_at
    # via the serializer

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        pass  # Default table name: accounts_user

    def __str__(self):
        return self.email
