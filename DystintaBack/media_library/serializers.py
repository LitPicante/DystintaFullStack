from rest_framework import serializers

from core.media_urls import build_media_url
from .models import HomeCarouselMedia


class HomeCarouselMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = HomeCarouselMedia
        fields = ["slot", "file", "original_name"]

    def get_file(self, obj):
        request = self.context.get("request")
        return build_media_url(request, obj.file)
