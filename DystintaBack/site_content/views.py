from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.defaults import MODEL_DEFAULTS
from core.permissions import IsAdmin
from .models import (
    AboutContent,
    CalculatorContent,
    ContactContent,
    DesignsContent,
    HomeContent,
    ServicesContent,
    SiteSettings,
)
from .serializers import (
    AboutContentSerializer,
    CalculatorContentSerializer,
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
        serializer = self.serializer_class(self.get_object())
        return Response(serializer.data)

    def patch(self, request):
        instance = self.get_object()
        serializer = self.serializer_class(instance, data=request.data, partial=True)
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
        }
        serializer = PublicSiteSerializer(payload)
        return Response(serializer.data)
