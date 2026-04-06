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


# ── Video ─────────────────────────────────────────────────────────────────────

class FeedView(APIView):
    """GET /api/videos/feed/ — latest 20 videos with profile, restaurant, is_liked."""

    def get(self, request):
        videos = (
            Video.objects
            .select_related('user', 'restaurant')
            .order_by('-created_at')[:20]
        )
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
    GET  /api/videos/?user_id=<uuid> — list (optionally filtered by user)
    POST /api/videos/               — upload a new video (multipart)
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = Video.objects.select_related('user', 'restaurant').order_by('-created_at')
        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return Response(VideoSerializer(qs[:50], many=True, context={'request': request}).data)

    def post(self, request):
        video_file = request.FILES.get('video')
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
            video.video_file = video_file
        else:
            video.video_url = request.data.get('video_url', '')

        video.thumbnail_url = request.data.get('thumbnail_url', '')
        video.save()
        return Response(VideoSerializer(video, context={'request': request}).data, status=status.HTTP_201_CREATED)


class VideoDeleteView(APIView):
    """DELETE /api/videos/<uuid>/ — supprime la vidéo et son fichier (propriétaire seulement)."""

    def delete(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        if video.user_id != request.user.id:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        # Supprimer le fichier physique du disque
        if video.video_file:
            try:
                video.video_file.delete(save=False)
            except Exception:
                pass
        video.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LikeView(APIView):
    """
    POST   /api/videos/<uuid>/like/ — like
    DELETE /api/videos/<uuid>/like/ — unlike
    """

    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        _, created = Like.objects.get_or_create(user=request.user, video=video)
        if created:
            Video.objects.filter(pk=pk).update(likes_count=video.likes_count + 1)
        return Response({'liked': True}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        deleted, _ = Like.objects.filter(user=request.user, video=video).delete()
        if deleted:
            Video.objects.filter(pk=pk).update(
                likes_count=max(0, video.likes_count - 1)
            )
        return Response({'liked': False}, status=status.HTTP_200_OK)


class CommentListCreateView(APIView):
    """
    GET  /api/videos/<uuid>/comments/ — list comments
    POST /api/videos/<uuid>/comments/ — add comment
    """

    def get(self, request, pk):
        get_object_or_404(Video, pk=pk)
        comments = Comment.objects.filter(video_id=pk).select_related('user').order_by('-created_at')
        return Response(CommentSerializer(comments, many=True).data)

    def post(self, request, pk):
        video = get_object_or_404(Video, pk=pk)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'detail': 'Comment text is required.'}, status=400)

        comment = Comment.objects.create(user=request.user, video=video, text=text)
        Video.objects.filter(pk=pk).update(comments_count=video.comments_count + 1)
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


# ── Restaurant ────────────────────────────────────────────────────────────────

class RestaurantListCreateView(APIView):
    """
    GET  /api/restaurants/?search=<term> — list / search
    POST /api/restaurants/               — create
    """

    def get(self, request):
        qs = Restaurant.objects.all()
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(cuisine_type__icontains=search)
        return Response(RestaurantSerializer(qs[:50], many=True).data)

    def post(self, request):
        serializer = RestaurantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RestaurantDetailView(APIView):
    """GET /api/restaurants/<uuid>/ — detail with is_saved flag."""

    def get(self, request, pk):
        restaurant = get_object_or_404(Restaurant, pk=pk)
        data = RestaurantSerializer(restaurant).data
        data['is_saved'] = SavedPlace.objects.filter(
            user=request.user, restaurant=restaurant
        ).exists()
        return Response(data)


class SavedPlaceView(APIView):
    """
    POST   /api/restaurants/<uuid>/save/ — save a restaurant
    DELETE /api/restaurants/<uuid>/save/ — unsave
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
    GET  /api/restaurants/<uuid>/reviews/ — list reviews
    POST /api/restaurants/<uuid>/reviews/ — add review
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

        # Recompute restaurant average rating
        agg = Review.objects.filter(restaurant=restaurant).aggregate(avg=Avg('rating'))
        restaurant.average_rating = round(agg['avg'] or 0, 1)
        restaurant.total_reviews = Review.objects.filter(restaurant=restaurant).count()
        restaurant.save(update_fields=['average_rating', 'total_reviews'])

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileDetailView(APIView):
    """GET /api/profiles/<uuid>/ — public profile."""

    def get(self, request, pk):
        from apps.accounts.models import User
        user = get_object_or_404(User, pk=pk)
        return Response(ProfileSerializer(user).data)
