from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'full_name', 'campus_location', 'is_staff', 'date_joined']
    search_fields = ['email', 'username', 'full_name']
    ordering = ['-date_joined']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {'fields': ('full_name', 'avatar_url', 'bio', 'campus_location',
                                'followers_count', 'following_count')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Profile', {'fields': ('email', 'full_name',)}),
    )
