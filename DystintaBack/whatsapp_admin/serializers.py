import re

from rest_framework import serializers


class WhatsAppInstanceCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)

    def validate_name(self, value):
        value = value.strip()
        if not re.match(r"^[A-Za-z0-9_-]+$", value):
            raise serializers.ValidationError(
                "El nombre solo puede contener letras, numeros, guion y guion bajo."
            )
        return value


class WhatsAppInstanceSerializer(serializers.Serializer):
    name = serializers.CharField()
    status = serializers.CharField()


class WhatsAppQrSerializer(serializers.Serializer):
    name = serializers.CharField()
    status = serializers.CharField()
    qr_base64 = serializers.CharField(allow_blank=True)
