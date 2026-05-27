import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import WhatsAppInstanceCreateSerializer
from .services.evolution_manager_service import (
    EvolutionManagerConfigurationError,
    EvolutionManagerRequestError,
    EvolutionManagerService,
)

logger = logging.getLogger(__name__)


class IsWhatsAppAdminUser:
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (getattr(request.user, "role", "") == "admin" or request.user.is_staff)
        )


class EvolutionAdminBaseView(APIView):
    permission_classes = [IsWhatsAppAdminUser]

    def get_service(self) -> EvolutionManagerService:
        return EvolutionManagerService()

    def handle_error(self, exc: Exception) -> Response:
        if isinstance(exc, EvolutionManagerConfigurationError):
            logger.warning("whatsapp_admin.config_error")
            return Response(
                {"detail": "Evolution API no esta configurado."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if isinstance(exc, EvolutionManagerRequestError):
            logger.warning("whatsapp_admin.request_error")
            return Response(
                {"detail": "No se pudo comunicar con Evolution API."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        logger.exception("whatsapp_admin.unexpected_error")
        return Response(
            {"detail": "Error inesperado administrando WhatsApp."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class WhatsAppInstanceListView(EvolutionAdminBaseView):
    def get(self, request):
        try:
            logger.info("whatsapp_admin.instances.list user_id=%s", request.user.pk)
            return Response(self.get_service().list_instances())
        except Exception as exc:
            return self.handle_error(exc)


class WhatsAppInstanceCreateView(EvolutionAdminBaseView):
    def post(self, request):
        serializer = WhatsAppInstanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]

        try:
            logger.info("whatsapp_admin.instances.create user_id=%s name=%s", request.user.pk, name)
            data = self.get_service().create_instance(name)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return self.handle_error(exc)


class WhatsAppInstanceQrView(EvolutionAdminBaseView):
    def get(self, request, name):
        try:
            logger.info("whatsapp_admin.instances.qr user_id=%s name=%s", request.user.pk, name)
            return Response(self.get_service().fetch_qr(name))
        except Exception as exc:
            return self.handle_error(exc)


class WhatsAppInstanceStatusView(EvolutionAdminBaseView):
    def get(self, request, name):
        try:
            logger.info("whatsapp_admin.instances.status user_id=%s name=%s", request.user.pk, name)
            return Response(self.get_service().connection_state(name))
        except Exception as exc:
            return self.handle_error(exc)


class WhatsAppInstanceRestartView(EvolutionAdminBaseView):
    def post(self, request, name):
        try:
            logger.info("whatsapp_admin.instances.restart user_id=%s name=%s", request.user.pk, name)
            return Response(self.get_service().restart_instance(name))
        except Exception as exc:
            return self.handle_error(exc)


class WhatsAppInstanceLogoutView(EvolutionAdminBaseView):
    def post(self, request, name):
        try:
            logger.info("whatsapp_admin.instances.logout user_id=%s name=%s", request.user.pk, name)
            return Response(self.get_service().logout_instance(name))
        except Exception as exc:
            return self.handle_error(exc)


class WhatsAppInstanceDeleteView(EvolutionAdminBaseView):
    def delete(self, request, name):
        try:
            logger.info("whatsapp_admin.instances.delete user_id=%s name=%s", request.user.pk, name)
            return Response(self.get_service().delete_instance(name))
        except Exception as exc:
            return self.handle_error(exc)
