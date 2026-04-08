from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError

from .models import User
from .serializers import ProfileSerializer, ProfileUpdateSerializer


def _make_token_response(user, http_status=status.HTTP_200_OK):
    """
    Fonction utilitaire partagée par RegisterView et LoginView.
    Génère une paire de tokens JWT (access + refresh) pour l'utilisateur
    et renvoie également son profil sérialisé dans la même réponse.
    """
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),   # Token à courte durée (~1h)
        'refresh': str(refresh),               # Token longue durée (~14 jours)
        'user': ProfileSerializer(user).data,  # Profil complet pour le front
    }, status=http_status)


class RegisterView(APIView):
    """
    POST /api/auth/register/ — Création d'un nouveau compte utilisateur.
    Accessible sans authentification (AllowAny).
    Renvoie access + refresh + profil en cas de succès (201 Created).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Normalisation : l'email est mis en minuscules pour éviter les doublons
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        username = request.data.get('username', '').strip()
        full_name = request.data.get('full_name', '').strip()

        # Validation des champs obligatoires
        if not email or not password or not username:
            return Response({'detail': 'email, password and username are required.'}, status=400)

        # Vérification de l'unicité de l'email et du nom d'utilisateur
        if User.objects.filter(email=email).exists():
            return Response({'detail': 'An account with this email already exists.'}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({'detail': 'This username is already taken.'}, status=400)

        # Création de l'utilisateur (le mot de passe est hashé par create_user)
        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            full_name=full_name,
        )
        return _make_token_response(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/auth/login/ — Connexion avec email + mot de passe.
    Accessible sans authentification (AllowAny).
    Renvoie access + refresh + profil en cas de succès (200 OK).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        # Django vérifie l'email ET le mot de passe hashé en base
        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        return _make_token_response(user)


class LogoutView(APIView):
    """
    POST /api/auth/logout/ — Déconnexion.
    Invalide le refresh token en l'ajoutant à la blacklist JWT.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()  # Empêche la réutilisation du token
        except TokenError:
            pass  # Token déjà expiré ou invalide — c'est acceptable
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    GET   /api/auth/me/   — Récupère le profil de l'utilisateur connecté.
    PATCH /api/auth/me/   — Met à jour les champs modifiables du profil.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # request.user est rempli automatiquement grâce au token JWT dans le header
        return Response(ProfileSerializer(request.user).data)

    def patch(self, request):
        # partial=True → seuls les champs envoyés sont mis à jour
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(request.user).data)
