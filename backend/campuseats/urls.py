from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve


def serve_media(request, path):
    """Serve media files with Accept-Ranges + Range request support (required by iOS AVPlayer)."""
    from django.http import FileResponse, HttpResponse, Http404
    import os, mimetypes
    media_root = getattr(settings, 'MEDIA_ROOT', None)
    if not media_root:
        raise Http404
    full_path = os.path.join(media_root, path)
    # Basic path traversal protection
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
        # Handle range request for iOS AVPlayer seeking
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

    response = FileResponse(open(real_path, 'rb'), content_type=content_type)
    response['Content-Length'] = str(file_size)
    response['Accept-Ranges'] = 'bytes'
    return response


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.content.urls')),
    # Serve uploaded media files — FileResponse includes Accept-Ranges + Content-Length
    # so iOS AVPlayer can stream videos correctly (range requests)
    re_path(r'^media/(?P<path>.*)$', serve_media),
]
