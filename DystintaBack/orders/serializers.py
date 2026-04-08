import json

from rest_framework import serializers

from accounts.serializers import UserSerializer
from accounts.models import User
from .models import Order


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
        validated_data.setdefault("status", Order.STATUS_NUEVO)
        validated_data.setdefault("notes", "")
        validated_data.setdefault("extra_data", {})
        return super().create(validated_data)


class OrderListSerializer(serializers.ModelSerializer):
    fileName = serializers.CharField(source="file_name", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    assignedTo = UserSerializer(source="assigned_to", read_only=True)
    extraData = serializers.JSONField(source="extra_data", read_only=True)
    file = serializers.SerializerMethodField()

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
            "updatedAt",
        ]

    def get_file(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


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
