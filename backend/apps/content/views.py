import uuid
import json
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated

from apps.accounts.serializers import ProfileSerializer
from .models import Restaurant, Video, Review, Like, Comment, SavedPlace
from .serializers import (
    RestaurantSerializer, VideoSerializer, VideoFeedSerializer,
    ReviewSerializer, CommentSerializer,
)


# ── Vidéo ────────────────────────────────────────────────────────────────────

class FeedView(APIView):
    """
    GET /api/videos/feed/ — Fil d'actualité principal.
    Retourne les 20 dernières vidéos enrichies du profil auteur,
    du restaurant associé et d'un booléen is_liked pour l'utilisateur courant.
    """

    def get(self, request):
        # select_related évite les requêtes N+1 (jointures SQL en une seule requête)
        videos = (
            Video.objects
            .select_related('user', 'restaurant')
            .order_by('-created_at')[:20]
        )
        # Récupère en une requête tous les IDs de vidéos aimées par l'utilisateur courant
        video_ids = [v.id for v in videos]
        liked_ids = set(
            Like.objects
            .filter(user=request.user, video_id__in=video_ids)
            .values_list('video_id', flat=True)
        )
        data = VideoFeedSerializer(
            videos, many=True,
            context={'liked_video_ids': liked_ids, 'request': request}
        ).data
        return Response(data)


class VideoListCreateView(APIView):
    """
    GET  /api/videos/?user_id=<uuid> — Liste les vidéos d'un utilisateur
    POST /api/videos/               — Publie une nouvelle vidéo (multipart/form-data)
    """
    # MultiPartParser + FormParser pour l'upload de fichiers binaires
    # JSONParser pour les requêtes sans fichier (tests unitaires, etc.)
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = Video.objects.select_related('user', 'restaurant').order_by('-created_at')
        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)  # Filtre par auteur si user_id fourni
        return Response(VideoSerializer(qs[:50], many=True, context={'request': request}).data)

    def post(self, request):
        video_file = request.FILES.get('video')
        # Les tags arrivent en JSON-string depuis FormData (ex. '["burger","étudiant"]')
        tags_raw = request.data.get('tags', '[]')
        try:
            tags = json.loads(tags_raw) if isinstance(tags_raw, str) else tags_raw
        except (json.JSONDecodeError, TypeError):
            tags = []

        video = Video(
            user=request.user,
            caption=request.data.get('caption', ''),
            tags=tags,
            is_food_hack=str(request.data.get('is_food_hack', 'false')).lower() == 'true',
            duration=int(request.data.get('duration', 0) or 0),
        )
        if video_file:
            video.video_file = video_file  # Fichier uploadé depuis le mobile
        else:
            video.video_url = request.data.get('video_url', '')  # URL externe (fallback)

        video.thumbnail_url = request.data.get('thumbnail_url', '')
        video.save()
        return Response(VideoSerializer(video, context={'request': request}).data, status=status.HTTP_201_CREATED)


class VideoDeleteView(APIView):
    """DELETE /api/videos/<uuid>/ — Supprime une vidéo et son fichier (propriétaire uniquement)."""

    def delete(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        # Vérifie que l'utilisateur est bien le propriétaire de la vidéo
        if video.user_id != request.user.id:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        # Supprime le fichier physique du disque pour libérer l'espace
        if video.video_file:
            try:
                video.video_file.delete(save=False)
            except Exception:
                pass
        video.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LikeView(APIView):
    """
    POST   /api/videos/<uuid>/like/ — Aimer une vidéo (♥)
    DELETE /api/videos/<uuid>/like/ — Retirer son like
    """

    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        # get_or_create évite les doublons (unique_together sur le modèle Like)
        _, created = Like.objects.get_or_create(user=request.user, video=video)
        if created:
            Video.objects.filter(pk=pk).update(likes_count=video.likes_count + 1)
        return Response({'liked': True}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        deleted, _ = Like.objects.filter(user=request.user, video=video).delete()
        if deleted:
            # Décrémente le compteur (min 0 pour éviter les valeurs négatives)
            Video.objects.filter(pk=pk).update(
                likes_count=max(0, video.likes_count - 1)
            )
        return Response({'liked': False}, status=status.HTTP_200_OK)


class CommentListCreateView(APIView):
    """
    GET  /api/videos/<uuid>/comments/ — Liste les commentaires d'une vidéo
    POST /api/videos/<uuid>/comments/ — Ajoute un commentaire
    """

    def get(self, request, pk):
        get_object_or_404(Video, pk=pk)  # Vérifie que la vidéo existe (404 sinon)
        comments = Comment.objects.filter(video_id=pk).select_related('user').order_by('-created_at')
        return Response(CommentSerializer(comments, many=True).data)

    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'detail': 'Comment text is required.'}, status=400)

        comment = Comment.objects.create(user=request.user, video=video, text=text)
        # Incrémente le compteur de commentaires sur la vidéo
        Video.objects.filter(pk=pk).update(comments_count=video.comments_count + 1)
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


# ── Restaurant ────────────────────────────────────────────────────────────────

class RestaurantListCreateView(APIView):
    """
    GET  /api/restaurants/?search=<terme> — Liste et recherche de restaurants
    POST /api/restaurants/               — Crée un nouveau restaurant
    La recherche filtre sur le nom ET le type de cuisine (insensible à la casse).
    """

    def get(self, request):
        qs = Restaurant.objects.all()
        search = request.query_params.get('search', '').strip()
        if search:
            # Recherche sur le nom OU le type de cuisine
            qs = qs.filter(name__icontains=search) | qs.filter(cuisine_type__icontains=search)
        return Response(RestaurantSerializer(qs[:50], many=True).data)

    def post(self, request):
        serializer = RestaurantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)  # Lie le restaurant au créateur
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RestaurantDetailView(APIView):
    """
    GET /api/restaurants/<uuid>/ — Détail d'un restaurant.
    Ajoute is_saved : vrai si l'utilisateur courant a mis ce restaurant en favori.
    """

    def get(self, request, pk):
        restaurant = get_object_or_404(Restaurant, pk=pk)
        data = RestaurantSerializer(restaurant).data
        # Indique si l'utilisateur connecté a sauvegardé ce restaurant
        data['is_saved'] = SavedPlace.objects.filter(
            user=request.user, restaurant=restaurant
        ).exists()
        return Response(data)


class SavedPlaceView(APIView):
    """
    POST   /api/restaurants/<uuid>/save/ — Sauvegarder un restaurant en favori
    DELETE /api/restaurants/<uuid>/save/ — Retirer des favoris
    """

    def post(self, request, pk):
        restaurant = get_object_or_404(Restaurant, pk=pk)
        SavedPlace.objects.get_or_create(user=request.user, restaurant=restaurant)
        return Response({'saved': True})

    def delete(self, request, pk):
        restaurant = get_object_or_404(Restaurant, pk=pk)
        SavedPlace.objects.filter(user=request.user, restaurant=restaurant).delete()
        return Response({'saved': False})


class ReviewListCreateView(APIView):
    """
    GET  /api/restaurants/<uuid>/reviews/ — Liste les avis d'un restaurant
    POST /api/restaurants/<uuid>/reviews/ — Ajoute un avis
    Après chaque ajout, la note moyenne du restaurant est recalculée.
    """

    def get(self, request, pk):
        get_object_or_404(Restaurant, pk=pk)
        reviews = Review.objects.filter(restaurant_id=pk).order_by('-created_at')
        return Response(ReviewSerializer(reviews, many=True).data)

    def post(self, request, pk):
        restaurant = get_object_or_404(Restaurant, pk=pk)
        rating = int(request.data.get('rating', 5))
        comment = request.data.get('comment', '').strip()

        review = Review.objects.create(
            user=request.user,
            restaurant=restaurant,
            rating=rating,
            comment=comment,
        )

        # Recalcule la note moyenne du restaurant après chaque nouvel avis
        agg = Review.objects.filter(restaurant=restaurant).aggregate(avg=Avg('rating'))
        restaurant.average_rating = round(agg['avg'] or 0, 1)
        restaurant.total_reviews = Review.objects.filter(restaurant=restaurant).count()
        restaurant.save(update_fields=['average_rating', 'total_reviews'])

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


# ── Profil ───────────────────────────────────────────────────────────────────

class ProfileDetailView(APIView):
    """GET /api/profiles/<uuid>/ — Profil public d'un utilisateur."""

    def get(self, request, pk):
        from apps.accounts.models import User
        user = get_object_or_404(User, pk=pk)
        return Response(ProfileSerializer(user).data)
