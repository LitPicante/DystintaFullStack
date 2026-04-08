from rest_framework import serializers

from .models import HomeCarouselMedia


class HomeCarouselMediaSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = HomeCarouselMedia
        fields = ["slot", "file", "original_name"]

    def get_file(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url
