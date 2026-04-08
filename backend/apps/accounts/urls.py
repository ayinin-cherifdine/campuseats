from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, LogoutView, MeView

# Toutes ces routes sont préfixées par /api/auth/ (défini dans campuseats/urls.py)
urlpatterns = [
    path('register/', RegisterView.as_view()),         # POST — Créer un compte
    path('login/', LoginView.as_view()),               # POST — Se connecter
    path('logout/', LogoutView.as_view()),             # POST — Se déconnecter
    path('token/refresh/', TokenRefreshView.as_view()),# POST — Renouveler l'access token
    path('me/', MeView.as_view()),                     # GET/PATCH — Profil connecté
]
