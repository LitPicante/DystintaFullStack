from rest_framework import serializers

from .models import (
    AboutContent,
    AboutContentCard,
    CalculatorContent,
    CatalogProduct,
    ContactContent,
    DesignsContent,
    HomeContent,
    ServicesContent,
    SiteSettings,
)


class SiteSettingsSerializer(serializers.ModelSerializer):
    companyName = serializers.CharField(source="company_name")
    whatsappRaw = serializers.CharField(source="whatsapp_raw")
    map = serializers.CharField(source="map_url")
    themePrimary = serializers.CharField(source="theme_primary")
    themeSecondary = serializers.CharField(source="theme_secondary")
    themeAccent = serializers.CharField(source="theme_accent")
    themeBackground = serializers.CharField(source="theme_background")
    themeSurface = serializers.CharField(source="theme_surface")
    themeText = serializers.CharField(source="theme_text")

    class Meta:
        model = SiteSettings
        fields = [
            "companyName",
            "slogan",
            "whatsapp",
            "whatsappRaw",
            "instagram",
            "facebook",
            "tiktok",
            "email",
            "address",
            "map",
            "themePrimary",
            "themeSecondary",
            "themeAccent",
            "themeBackground",
            "themeSurface",
            "themeText",
        ]


class HomeContentSerializer(serializers.ModelSerializer):
    heroNote = serializers.CharField(source="hero_note")
    video1 = serializers.CharField(source="video1_label")
    video2 = serializers.CharField(source="video2_label")
    video3 = serializers.CharField(source="video3_label")

    class Meta:
        model = HomeContent
        fields = ["title", "subtitle", "heroNote", "video1", "video2", "video3"]


class AboutContentCardSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = AboutContentCard
        fields = ["id", "title", "text", "image", "order"]

    def get_image(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class AboutContentSerializer(serializers.ModelSerializer):
    cards = AboutContentCardSerializer(many=True, read_only=True)

    class Meta:
        model = AboutContent
        fields = ["title", "text", "cards"]


class ServicesContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicesContent
        fields = ["title", "textil", "uv", "serigrafia"]


class DesignsContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignsContent
        fields = ["title", "text"]


class CalculatorContentSerializer(serializers.ModelSerializer):
    pricePerCm2 = serializers.DecimalField(source="price_per_cm2", max_digits=12, decimal_places=2)
    minCharge = serializers.DecimalField(source="min_charge", max_digits=12, decimal_places=2)
    extraRush = serializers.DecimalField(source="extra_rush", max_digits=12, decimal_places=2)

    class Meta:
        model = CalculatorContent
        fields = ["title", "pricePerCm2", "minCharge", "extraRush"]


class ContactContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactContent
        fields = ["title", "text"]


class CatalogProductSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = CatalogProduct
        fields = ["id", "name", "description", "price", "image", "order", "active"]

    def get_image(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class PublicSiteSerializer(serializers.Serializer):
    general = SiteSettingsSerializer()
    home = HomeContentSerializer()
    about = AboutContentSerializer()
    services = ServicesContentSerializer()
    designs = DesignsContentSerializer()
    calc = CalculatorContentSerializer()
    contact = ContactContentSerializer()
    catalog = CatalogProductSerializer(many=True)
