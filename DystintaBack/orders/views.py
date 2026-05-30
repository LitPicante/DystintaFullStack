import json

from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import IsAdmin, IsAdminOrDesigner
from .models import Order, OrderAttachment
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatsSerializer,
    OrderTrackingSerializer,
    OrderUpdateSerializer,
)
from .services.whatsapp_service import (
    notify_admin_new_order,
    notify_admin_status_change,
    process_evolution_webhook,
    send_order_status_message_on_commit,
)


def is_backoffice_designer_order(data):
    extra_data = data.get("extraData") or data.get("extra_data") or {}
    if isinstance(extra_data, str):
        try:
            extra_data = json.loads(extra_data)
        except json.JSONDecodeError:
            extra_data = {}
    return isinstance(extra_data, dict) and extra_data.get("source") == "backoffice-create-order"


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("assigned_to").prefetch_related("attachments").all().order_by("-created_at")
    http_method_names = ["get", "post", "patch", "delete"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        if self.action in {"history", "hide_from_history"}:
            return [IsAdmin()]
        if self.action == "destroy":
            return [IsAdminOrDesigner()]
        return [IsAdminOrDesigner()]

    def get_queryset(self):
        queryset = Order.objects.select_related("assigned_to").prefetch_related("attachments").all().order_by("-created_at")
        user = self.request.user

        if self.action == "history":
            queryset = queryset.filter(
                archived_at__isnull=False,
                history_hidden_at__isnull=True,
            ).order_by("-archived_at", "-updated_at")
        elif self.action == "hide_from_history":
            queryset = queryset.filter(archived_at__isnull=False)
        else:
            queryset = queryset.filter(archived_at__isnull=True)

        if user.is_authenticated and user.role == "designer":
            queryset = queryset.filter(Q(assigned_to__isnull=True) | Q(assigned_to=user))

        status_value = self.request.query_params.get("status")
        service = self.request.query_params.get("service")
        assigned_to = self.request.query_params.get("assigned_to")
        search = self.request.query_params.get("search")
        mine = self.request.query_params.get("mine")

        if status_value:
            queryset = queryset.filter(status=status_value)
        if service:
            queryset = queryset.filter(service=service)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
                | Q(order_number__icontains=search)
                | Q(details__icontains=search)
                | Q(file_name__icontains=search)
            )
        if mine == "true" and user.is_authenticated:
            queryset = queryset.filter(assigned_to=user)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        if self.action == "list":
            return OrderListSerializer
        if self.action == "retrieve":
            return OrderDetailSerializer
        if self.action == "partial_update":
            return OrderUpdateSerializer
        if self.action == "stats":
            return OrderStatsSerializer
        return OrderListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            save_kwargs = {}
            if (
                request.user
                and request.user.is_authenticated
                and getattr(request.user, "role", "") == "designer"
                and is_backoffice_designer_order(request.data)
            ):
                save_kwargs["assigned_to"] = request.user

            order = serializer.save(**save_kwargs)
            for uploaded_file in request.FILES.getlist("attachments"):
                OrderAttachment.objects.create(
                    order=order,
                    file=uploaded_file,
                    original_name=uploaded_file.name,
                )
            send_order_status_message_on_commit(order)
            transaction.on_commit(lambda order_id=order.pk: notify_admin_new_order(Order.objects.get(pk=order_id)))
        output = OrderCreateSerializer(order, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        previous_status = instance.status
        previous_order_number = instance.order_number
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            order = serializer.save()
            if previous_status != order.status or previous_order_number != order.order_number:
                send_order_status_message_on_commit(order)
            if previous_status != order.status:
                transaction.on_commit(lambda order_id=order.pk: notify_admin_status_change(Order.objects.get(pk=order_id)))
        output = OrderDetailSerializer(instance, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        reason = str(request.data.get("reason", "") or "").strip() if isinstance(request.data, dict) else ""
        instance.archived_at = timezone.now()
        instance.archived_by = request.user if request.user.is_authenticated else None
        instance.archived_reason = reason[:255]
        instance.save(update_fields=["archived_at", "archived_by", "archived_reason", "updated_at"])
        output = OrderDetailSerializer(instance, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        queryset = self.get_queryset()
        data = {
            "total": queryset.count(),
            "new": queryset.filter(status=Order.STATUS_ARCHIVO_RECIBIDO).count(),
            "design": queryset.filter(status=Order.STATUS_DISENO).count(),
            "done": queryset.filter(status__in=[Order.STATUS_ENTREGADO, Order.STATUS_FINALIZADO]).count(),
        }
        serializer = OrderStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        serializer = OrderListSerializer(self.get_queryset(), many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="hide-from-history")
    def hide_from_history(self, request, pk=None):
        instance = self.get_object()
        instance.history_hidden_at = timezone.now()
        instance.history_hidden_by = request.user if request.user.is_authenticated else None
        instance.save(update_fields=["history_hidden_at", "history_hidden_by", "updated_at"])
        output = OrderDetailSerializer(instance, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)


class OrderTrackingView(RetrieveAPIView):
    serializer_class = OrderTrackingSerializer
    permission_classes = [AllowAny]
    lookup_field = "tracking_token"
    lookup_url_kwarg = "token"

    def get_queryset(self):
        return Order.objects.filter(tracking_enabled=True, tracking_token__isnull=False)


class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        result = process_evolution_webhook(request.data if isinstance(request.data, dict) else {})
        return Response(result, status=status.HTTP_200_OK)
