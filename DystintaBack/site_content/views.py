import json

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.defaults import MODEL_DEFAULTS
from core.permissions import IsAdmin
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
from .serializers import (
    AboutContentSerializer,
    CalculatorContentSerializer,
    CatalogProductSerializer,
    ContactContentSerializer,
    DesignsContentSerializer,
    HomeContentSerializer,
    PublicSiteSerializer,
    ServicesContentSerializer,
    SiteSettingsSerializer,
)


def get_singleton(model_class, defaults):
    obj, _ = model_class.objects.get_or_create(pk=1, defaults=defaults)
    return obj


class BaseSingletonContentView(APIView):
    model_class = None
    serializer_class = None
    defaults_key = None

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAdmin()]

    def get_object(self):
        return get_singleton(self.model_class, MODEL_DEFAULTS[self.defaults_key])

    def get(self, request):
        serializer = self.serializer_class(self.get_object(), context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        instance = self.get_object()
        serializer = self.serializer_class(instance, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GeneralContentView(BaseSingletonContentView):
    model_class = SiteSettings
    serializer_class = SiteSettingsSerializer
    defaults_key = "general"


class HomeContentView(BaseSingletonContentView):
    model_class = HomeContent
    serializer_class = HomeContentSerializer
    defaults_key = "home"


class AboutContentView(BaseSingletonContentView):
    model_class = AboutContent
    serializer_class = AboutContentSerializer
    defaults_key = "about"

    def patch(self, request):
        instance = self.get_object()
        serializer = self.serializer_class(instance, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if "cards" in request.data:
            try:
                cards_payload = json.loads(request.data.get("cards") or "[]")
            except json.JSONDecodeError:
                cards_payload = []

            keep_ids = []
            for index, card_data in enumerate(cards_payload):
                card_id = card_data.get("id")
                if card_id:
                    card = AboutContentCard.objects.filter(about=instance, pk=card_id).first()
                    if not card:
                        card = AboutContentCard(about=instance)
                else:
                    card = AboutContentCard(about=instance)

                card.title = card_data.get("title", "")
                card.text = card_data.get("text", "")
                card.order = index
                image_file = request.FILES.get(f"image_{index}")
                if image_file:
                    card.image = image_file
                card.save()
                keep_ids.append(card.id)

            AboutContentCard.objects.filter(about=instance).exclude(id__in=keep_ids).delete()

        output = self.serializer_class(instance, context={"request": request})
        return Response(output.data)


class ServicesContentView(BaseSingletonContentView):
    model_class = ServicesContent
    serializer_class = ServicesContentSerializer
    defaults_key = "services"


class DesignsContentView(BaseSingletonContentView):
    model_class = DesignsContent
    serializer_class = DesignsContentSerializer
    defaults_key = "designs"


class CalcContentView(BaseSingletonContentView):
    model_class = CalculatorContent
    serializer_class = CalculatorContentSerializer
    defaults_key = "calc"


class ContactContentView(BaseSingletonContentView):
    model_class = ContactContent
    serializer_class = ContactContentSerializer
    defaults_key = "contact"


class CatalogContentView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAdmin()]

    def get(self, request):
        queryset = CatalogProduct.objects.all()
        serializer = CatalogProductSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        try:
            products_payload = json.loads(request.data.get("products") or "[]")
        except json.JSONDecodeError:
            products_payload = []

        keep_ids = []
        for index, product_data in enumerate(products_payload):
            product_id = product_data.get("id")
            if product_id:
                product = CatalogProduct.objects.filter(pk=product_id).first()
                if not product:
                    product = CatalogProduct()
            else:
                product = CatalogProduct()

            product.name = product_data.get("name", "")
            product.description = product_data.get("description", "")
            product.price = product_data.get("price") or 0
            product.active = bool(product_data.get("active", True))
            product.order = index
            image_file = request.FILES.get(f"image_{index}")
            if image_file:
                product.image = image_file
            product.save()
            keep_ids.append(product.id)

        CatalogProduct.objects.exclude(id__in=keep_ids).delete()
        serializer = CatalogProductSerializer(CatalogProduct.objects.all(), many=True, context={"request": request})
        return Response(serializer.data)


class PublicSiteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        payload = {
            "general": get_singleton(SiteSettings, MODEL_DEFAULTS["general"]),
            "home": get_singleton(HomeContent, MODEL_DEFAULTS["home"]),
            "about": get_singleton(AboutContent, MODEL_DEFAULTS["about"]),
            "services": get_singleton(ServicesContent, MODEL_DEFAULTS["services"]),
            "designs": get_singleton(DesignsContent, MODEL_DEFAULTS["designs"]),
            "calc": get_singleton(CalculatorContent, MODEL_DEFAULTS["calc"]),
            "contact": get_singleton(ContactContent, MODEL_DEFAULTS["contact"]),
            "catalog": CatalogProduct.objects.filter(active=True),
        }
        serializer = PublicSiteSerializer(payload, context={"request": request})
        return Response(serializer.data)
