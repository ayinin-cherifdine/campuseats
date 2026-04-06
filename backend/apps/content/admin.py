from django.contrib import admin
from .models import Restaurant, Video, Review, Like, Comment, Follow, SavedPlace


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ['name', 'cuisine_type', 'price_range', 'average_rating', 'total_reviews']
    search_fields = ['name', 'cuisine_type']


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['user', 'caption', 'likes_count', 'comments_count', 'created_at']
    search_fields = ['caption', 'user__email']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'restaurant', 'rating', 'created_at']


admin.site.register(Like)
admin.site.register(Comment)
admin.site.register(Follow)
admin.site.register(SavedPlace)
