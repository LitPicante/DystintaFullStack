import json

from django.contrib.auth.hashers import identify_hasher
from django.core.files.uploadedfile import UploadedFile
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from core.defaults import DEFAULT_SITE_DATA, DEFAULT_USERS, MODEL_DEFAULTS
from core.permissions import IsAdmin
from media_library.models import HomeCarouselMedia
from orders.models import Order
from orders.serializers import OrderDetailSerializer
from site_content.models import (
    AboutContent,
    CalculatorContent,
    ContactContent,
    DesignsContent,
    HomeContent,
    ServicesContent,
    SiteSettings,
)
from site_content.serializers import (
    AboutContentSerializer,
    CalculatorContentSerializer,
    ContactContentSerializer,
    DesignsContentSerializer,
    HomeContentSerializer,
    ServicesContentSerializer,
    SiteSettingsSerializer,
)


def get_or_create_singletons():
    general, _ = SiteSettings.objects.get_or_create(pk=1, defaults=MODEL_DEFAULTS["general"])
    home, _ = HomeContent.objects.get_or_create(pk=1, defaults=MODEL_DEFAULTS["home"])
    about, _ = AboutContent.objects.get_or_create(pk=1, defaults=MODEL_DEFAULTS["about"])
    services, _ = ServicesContent.objects.get_or_create(pk=1, defaults=MODEL_DEFAULTS["services"])
    designs, _ = DesignsContent.objects.get_or_create(pk=1, defaults=MODEL_DEFAULTS["designs"])
    calc, _ = CalculatorContent.objects.get_or_create(pk=1, defaults=MODEL_DEFAULTS["calc"])
    contact, _ = ContactContent.objects.get_or_create(pk=1, defaults=MODEL_DEFAULTS["contact"])
    return {
        "general": general,
        "home": home,
        "about": about,
        "services": services,
        "designs": designs,
        "calc": calc,
        "contact": contact,
    }


def export_site_payload():
    singletons = get_or_create_singletons()
    return {
        "general": SiteSettingsSerializer(singletons["general"]).data,
        "home": HomeContentSerializer(singletons["home"]).data,
        "about": AboutContentSerializer(singletons["about"]).data,
        "services": ServicesContentSerializer(singletons["services"]).data,
        "designs": DesignsContentSerializer(singletons["designs"]).data,
        "calc": CalculatorContentSerializer(singletons["calc"]).data,
        "contact": ContactContentSerializer(singletons["contact"]).data,
    }


def replace_users(users_payload):
    User.objects.all().delete()
    for item in users_payload:
        user = User(
            username=item["username"],
            role=item["role"],
            display_name=item.get("name", ""),
            is_active=item.get("is_active", True),
        )
        password = item.get("password", "")
        if password:
            try:
                identify_hasher(password)
                user.password = password
            except Exception:
                user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()


def replace_orders(orders_payload):
    Order.objects.all().delete()
    user_map = {user.username: user for user in User.objects.all()}

    for item in orders_payload:
        assigned_to = None
        assigned_value = item.get("assignedTo")

        if isinstance(assigned_value, dict):
            assigned_username = assigned_value.get("username")
            assigned_to = user_map.get(assigned_username)
        elif isinstance(assigned_value, str):
            assigned_to = user_map.get(assigned_value)
        elif isinstance(assigned_value, int):
            assigned_to = User.objects.filter(pk=assigned_value).first()

        order = Order.objects.create(
            service=item["service"],
            name=item["name"],
            phone=item["phone"],
            email=item.get("email", ""),
            quantity=item.get("quantity", ""),
            details=item.get("details", ""),
            file_name=item.get("fileName", ""),
            status=item.get("status", Order.STATUS_NUEVO),
            assigned_to=assigned_to,
            notes=item.get("notes", ""),
            extra_data=item.get("extraData", {}) or {},
        )
        if item.get("createdAt"):
            order.created_at = item["createdAt"]
            order.save(update_fields=["created_at"])


def apply_site_payload(site_payload):
    singletons = get_or_create_singletons()

    mapping = [
        ("general", singletons["general"], SiteSettingsSerializer),
        ("home", singletons["home"], HomeContentSerializer),
        ("about", singletons["about"], AboutContentSerializer),
        ("services", singletons["services"], ServicesContentSerializer),
        ("designs", singletons["designs"], DesignsContentSerializer),
        ("calc", singletons["calc"], CalculatorContentSerializer),
        ("contact", singletons["contact"], ContactContentSerializer),
    ]

    for key, instance, serializer_class in mapping:
        if key in site_payload:
            serializer = serializer_class(instance, data=site_payload[key], partial=False)
            serializer.is_valid(raise_exception=True)
            serializer.save()


def reset_everything():
    apply_site_payload(DEFAULT_SITE_DATA)
    replace_users(DEFAULT_USERS)
    Order.objects.all().delete()

    for media in HomeCarouselMedia.objects.all():
        if media.file:
            media.file.delete(save=False)
    HomeCarouselMedia.objects.all().delete()


class AdminToolsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        users = [
            {
                "username": user.username,
                "password": user.password,
                "role": user.role,
                "name": user.display_name,
                "is_active": user.is_active,
            }
            for user in User.objects.all().order_by("id")
        ]
        orders = OrderDetailSerializer(Order.objects.select_related("assigned_to").all().order_by("-created_at"), many=True, context={"request": request}).data
        payload = {
            "site": export_site_payload(),
            "users": users,
            "orders": orders,
        }
        return Response(payload)

    @action(detail=False, methods=["post"], url_path="import")
    def import_data(self, request):
        incoming = request.data
        file_obj = request.FILES.get("file")

        if file_obj and isinstance(file_obj, UploadedFile):
            incoming = json.load(file_obj)

        if "site" not in incoming or "users" not in incoming or "orders" not in incoming:
            return Response({"detail": "JSON inválido"}, status=status.HTTP_400_BAD_REQUEST)

        apply_site_payload(incoming["site"])
        replace_users(incoming["users"])
        replace_orders(incoming["orders"])
        return Response(
            {
                "site": export_site_payload(),
                "users": [
                    {
                        "id": user.id,
                        "username": user.username,
                        "role": user.role,
                        "name": user.display_name,
                        "is_active": user.is_active,
                    }
                    for user in User.objects.all().order_by("id")
                ],
                "orders": OrderDetailSerializer(
                    Order.objects.select_related("assigned_to").all().order_by("-created_at"),
                    many=True,
                    context={"request": request},
                ).data,
            }
        )

    @action(detail=False, methods=["post"], url_path="reset")
    def reset(self, request):
        reset_everything()
        return Response(
            {
                "site": export_site_payload(),
                "users": [
                    {
                        "id": user.id,
                        "username": user.username,
                        "role": user.role,
                        "name": user.display_name,
                        "is_active": user.is_active,
                    }
                    for user in User.objects.all().order_by("id")
                ],
                "orders": [],
            }
        )
