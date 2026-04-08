from django.urls import path

from .views import OrderViewSet

order_list = OrderViewSet.as_view({"get": "list", "post": "create"})
order_detail = OrderViewSet.as_view({"get": "retrieve", "patch": "partial_update"})
order_stats = OrderViewSet.as_view({"get": "stats"})

urlpatterns = [
    path("orders/", order_list, name="orders-list"),
    path("orders/stats/", order_stats, name="orders-stats"),
    path("orders/<int:pk>/", order_detail, name="orders-detail"),
]
