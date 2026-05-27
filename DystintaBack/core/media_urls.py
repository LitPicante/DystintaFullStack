from urllib.parse import urljoin

from django.conf import settings


def build_media_url(request, file_field):
    if not file_field:
        return None

    file_url = file_field.url
    base_url = str(getattr(settings, "MEDIA_PUBLIC_BASE_URL", "") or "").strip()

    if base_url:
        return urljoin(f"{base_url.rstrip('/')}/", file_url.lstrip("/"))

    if request:
        return request.build_absolute_uri(file_url)

    return file_url
