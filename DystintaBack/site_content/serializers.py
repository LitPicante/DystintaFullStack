from rest_framework import serializers

from .models import (
    AboutContent,
    CalculatorContent,
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
        ]


class HomeContentSerializer(serializers.ModelSerializer):
    heroNote = serializers.CharField(source="hero_note")
    video1 = serializers.CharField(source="video1_label")
    video2 = serializers.CharField(source="video2_label")
    video3 = serializers.CharField(source="video3_label")

    class Meta:
        model = HomeContent
        fields = ["title", "subtitle", "heroNote", "video1", "video2", "video3"]


class AboutContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutContent
        fields = ["title", "text"]


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


class PublicSiteSerializer(serializers.Serializer):
    general = SiteSettingsSerializer()
    home = HomeContentSerializer()
    about = AboutContentSerializer()
    services = ServicesContentSerializer()
    designs = DesignsContentSerializer()
    calc = CalculatorContentSerializer()
    contact = ContactContentSerializer()
