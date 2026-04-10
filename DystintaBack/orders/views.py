from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import IsAdminOrDesigner
from .models import Order
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatsSerializer,
    OrderUpdateSerializer,
)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("assigned_to").all().order_by("-created_at")
    http_method_names = ["get", "post", "patch"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAdminOrDesigner()]

    def get_queryset(self):
        queryset = Order.objects.select_related("assigned_to").all().order_by("-created_at")
        user = self.request.user

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
        order = serializer.save()
        output = OrderCreateSerializer(order, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        output = OrderDetailSerializer(instance, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        queryset = self.get_queryset()
        data = {
            "total": queryset.count(),
            "new": queryset.filter(status=Order.STATUS_NUEVO).count(),
            "design": queryset.filter(status=Order.STATUS_DISENO).count(),
            "done": queryset.filter(status=Order.STATUS_FINALIZADO).count(),
        }
        serializer = OrderStatsSerializer(data)
        return Response(serializer.data)
