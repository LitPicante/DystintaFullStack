import json
from urllib.parse import quote

from rest_framework import serializers

from accounts.serializers import UserSerializer
from accounts.models import User
from .models import Order, OrderAttachment


STATUS_MESSAGE_MAP = {
    Order.STATUS_ARCHIVO_RECIBIDO: "recibido y registrado en nuestro sistema.",
    Order.STATUS_DISENO: "en preparación de diseño.",
    Order.STATUS_EN_COLA: "en cola de producción.",
    Order.STATUS_IMPRIMIENDO: "en impresión.",
    Order.STATUS_LISTO_RETIRAR: "listo para retirar.",
    Order.STATUS_ENTREGADO: "entregado.",
    Order.STATUS_EN_PAUSA: "en pausa temporalmente.",
    Order.STATUS_FINALIZADO: "finalizado.",
}


def normalize_whatsapp_phone(value):
    digits = "".join(char for char in str(value or "") if char.isdigit())
    return digits


def build_order_status_whatsapp_message(order):
    status_text = STATUS_MESSAGE_MAP.get(order.status, f"actualizado a {order.status}.")
    return (
        f"Hola {order.name}, tu pedido de {order.service} "
        f"se encuentra {status_text} "
        "Gracias por confiar en Dystinta."
    )


def build_order_status_whatsapp_url(order):
    phone = normalize_whatsapp_phone(order.phone)
    if not phone:
        return None
    return f"https://wa.me/{phone}?text={quote(build_order_status_whatsapp_message(order))}"


class FlexibleJSONField(serializers.JSONField):
    def to_internal_value(self, data):
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                raise serializers.ValidationError("JSON inválido.")
        return super().to_internal_value(data)


class OrderCreateSerializer(serializers.ModelSerializer):
    fileName = serializers.CharField(source="file_name", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    assignedTo = serializers.PrimaryKeyRelatedField(source="assigned_to", read_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    quantity = serializers.CharField(required=False, allow_blank=True)
    extraData = FlexibleJSONField(source="extra_data", required=False)

    class Meta:
        model = Order
        fields = [
            "id",
            "service",
            "name",
            "phone",
            "email",
            "quantity",
            "details",
            "file",
            "fileName",
            "status",
            "assignedTo",
            "notes",
            "extraData",
            "createdAt",
        ]

    def create(self, validated_data):
        uploaded_file = validated_data.get("file")
        if uploaded_file and not validated_data.get("file_name"):
            validated_data["file_name"] = uploaded_file.name
        validated_data.setdefault("status", Order.STATUS_ARCHIVO_RECIBIDO)
        validated_data.setdefault("notes", "")
        validated_data.setdefault("extra_data", {})
        return super().create(validated_data)


class OrderAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    originalName = serializers.CharField(source="original_name", read_only=True)

    class Meta:
        model = OrderAttachment
        fields = ["id", "file", "originalName", "created_at"]

    def get_file(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class OrderListSerializer(serializers.ModelSerializer):
    fileName = serializers.CharField(source="file_name", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    assignedTo = UserSerializer(source="assigned_to", read_only=True)
    extraData = serializers.JSONField(source="extra_data", read_only=True)
    file = serializers.SerializerMethodField()
    whatsappMessage = serializers.SerializerMethodField()
    whatsappUrl = serializers.SerializerMethodField()
    trackingToken = serializers.CharField(source="tracking_token", read_only=True)
    trackingEnabled = serializers.BooleanField(source="tracking_enabled", read_only=True)
    currentProgress = serializers.IntegerField(source="current_progress", read_only=True)
    statusUpdatedAt = serializers.DateTimeField(source="status_updated_at", read_only=True)
    statusMessage = serializers.SerializerMethodField()
    attachments = OrderAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "service",
            "name",
            "phone",
            "email",
            "quantity",
            "details",
            "file",
            "fileName",
            "status",
            "assignedTo",
            "notes",
            "extraData",
            "whatsappMessage",
            "whatsappUrl",
            "trackingToken",
            "trackingEnabled",
            "currentProgress",
            "statusUpdatedAt",
            "statusMessage",
            "attachments",
            "createdAt",
            "updatedAt",
        ]

    def get_file(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    def get_whatsappMessage(self, obj):
        return build_order_status_whatsapp_message(obj)

    def get_whatsappUrl(self, obj):
        return build_order_status_whatsapp_url(obj)

    def get_statusMessage(self, obj):
        return Order.message_for_status(obj.status)


class OrderDetailSerializer(OrderListSerializer):
    pass


class OrderUpdateSerializer(serializers.ModelSerializer):
    assignedTo = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.filter(role=User.ROLE_DESIGNER, is_active=True),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Order
        fields = ["status", "assignedTo", "notes"]

    def validate_status(self, value):
        valid_statuses = {choice[0] for choice in Order.STATUS_CHOICES}
        if value not in valid_statuses:
            raise serializers.ValidationError("Estado inválido.")
        return value


class OrderStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    new = serializers.IntegerField()
    design = serializers.IntegerField()
    done = serializers.IntegerField()


class OrderTrackingSerializer(serializers.ModelSerializer):
    currentProgress = serializers.IntegerField(source="current_progress", read_only=True)
    statusUpdatedAt = serializers.DateTimeField(source="status_updated_at", read_only=True)
    statusMessage = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "service",
            "status",
            "currentProgress",
            "statusMessage",
            "statusUpdatedAt",
        ]

    def get_statusMessage(self, obj):
        return Order.message_for_status(obj.status)
