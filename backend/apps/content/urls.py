from django.urls import path
from .views import (
    FeedView, VideoListCreateView, VideoDeleteView, LikeView, CommentListCreateView,
    RestaurantListCreateView, RestaurantDetailView, SavedPlaceView,
    ReviewListCreateView, ProfileDetailView,
)

urlpatterns = [
    # Videos
    path('videos/feed/', FeedView.as_view()),
    path('videos/', VideoListCreateView.as_view()),
    path('videos/<uuid:pk>/', VideoDeleteView.as_view()),
    path('videos/<uuid:pk>/like/', LikeView.as_view()),
    path('videos/<uuid:pk>/comments/', CommentListCreateView.as_view()),

    # Restaurants
    path('restaurants/', RestaurantListCreateView.as_view()),
    path('restaurants/<uuid:pk>/', RestaurantDetailView.as_view()),
    path('restaurants/<uuid:pk>/save/', SavedPlaceView.as_view()),
    path('restaurants/<uuid:pk>/reviews/', ReviewListCreateView.as_view()),

    # Profiles
    path('profiles/<uuid:pk>/', ProfileDetailView.as_view()),
]
