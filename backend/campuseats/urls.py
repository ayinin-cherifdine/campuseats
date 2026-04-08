from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve


def serve_media(request, path):
    """
    Sert les fichiers média uploadés (vidéos, images) avec support des requêtes
    HTTP Range (206 Partial Content), obligatoire pour que le lecteur vidéo iOS
    (AVPlayer) puisse mettre en mémoire tampon et se déplacer dans la vidéo.
    """
    from django.http import FileResponse, HttpResponse, Http404
    import os, mimetypes
    media_root = getattr(settings, 'MEDIA_ROOT', None)
    if not media_root:
        raise Http404
    full_path = os.path.join(media_root, path)
    # Protection contre la traversée de répertoire (path traversal attack)
    real_path = os.path.realpath(full_path)
    if not real_path.startswith(os.path.realpath(media_root)):
        raise Http404
    if not os.path.exists(real_path) or not os.path.isfile(real_path):
        raise Http404

    file_size = os.path.getsize(real_path)
    content_type, _ = mimetypes.guess_type(real_path)
    content_type = content_type or 'application/octet-stream'

    range_header = request.META.get('HTTP_RANGE', '')
    if range_header.startswith('bytes='):
        # Requête partielle : le client (iOS AVPlayer) demande un segment du fichier
        # Format : "bytes=<start>-<end>"  →  on renvoie HTTP 206 avec le bon segment
        ranges = range_header[6:].split(',')[0].strip()
        start_str, end_str = ranges.split('-')
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)
        length = end - start + 1

        with open(real_path, 'rb') as f:
            f.seek(start)
            data = f.read(length)
        response = HttpResponse(data, status=206, content_type=content_type)
        response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
        response['Content-Length'] = str(length)
        response['Accept-Ranges'] = 'bytes'
        return response

    # Requête complète : on envoie tout le fichier avec l'en-tête Accept-Ranges
    response = FileResponse(open(real_path, 'rb'), content_type=content_type)
    response['Content-Length'] = str(file_size)
    response['Accept-Ranges'] = 'bytes'
    return response


urlpatterns = [
    path('admin/', admin.site.urls),          # Interface d'administration Django
    path('api/auth/', include('apps.accounts.urls')),  # Routes : login, register, logout, me
    path('api/', include('apps.content.urls')),        # Routes : vidéos, restaurants, profils
    # Servir les fichiers média uploadés avec support des requêtes Range
    # (nécessaire pour la lecture vidéo sur iOS — voir serve_media ci-dessus)
    re_path(r'^media/(?P<path>.*)$', serve_media),
]
