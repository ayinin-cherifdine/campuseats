from django.urls import path
from .views import (
    FeedView, VideoListCreateView, VideoDeleteView, LikeView, CommentListCreateView,
    RestaurantListCreateView, RestaurantDetailView, SavedPlaceView,
    ReviewListCreateView, ProfileDetailView,
)

# Toutes ces routes sont préfixées par /api/ (défini dans campuseats/urls.py)
urlpatterns = [
    # ── Vidéos ──────────────────────────
    path('videos/feed/', FeedView.as_view()),               # Fil d'actualité (20 dernières vidéos)
    path('videos/', VideoListCreateView.as_view()),         # Liste + upload
    path('videos/<uuid:pk>/', VideoDeleteView.as_view()),   # Suppression
    path('videos/<uuid:pk>/like/', LikeView.as_view()),     # Aimer / retirer le like
    path('videos/<uuid:pk>/comments/', CommentListCreateView.as_view()),  # Commentaires

    # ── Restaurants ────────────────────
    path('restaurants/', RestaurantListCreateView.as_view()),              # Liste + recherche
    path('restaurants/<uuid:pk>/', RestaurantDetailView.as_view()),        # Détail
    path('restaurants/<uuid:pk>/save/', SavedPlaceView.as_view()),         # Favoris
    path('restaurants/<uuid:pk>/reviews/', ReviewListCreateView.as_view()),# Avis

    # ── Profils ─────────────────────
    path('profiles/<uuid:pk>/', ProfileDetailView.as_view()),              # Profil public
]
