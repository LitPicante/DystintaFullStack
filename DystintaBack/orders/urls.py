from django.urls import path

from .views import OrderTrackingView, OrderViewSet, WhatsAppWebhookView

order_list = OrderViewSet.as_view({"get": "list", "post": "create"})
order_detail = OrderViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
order_stats = OrderViewSet.as_view({"get": "stats"})
order_history = OrderViewSet.as_view({"get": "history"})
order_hide_from_history = OrderViewSet.as_view({"post": "hide_from_history"})

urlpatterns = [
    path("orders/", order_list, name="orders-list"),
    path("orders/stats/", order_stats, name="orders-stats"),
    path("orders/history/", order_history, name="orders-history"),
    path("orders/tracking/<str:token>/", OrderTrackingView.as_view(), name="orders-tracking"),
    path("orders/<int:pk>/hide-from-history/", order_hide_from_history, name="orders-hide-from-history"),
    path("orders/<int:pk>/", order_detail, name="orders-detail"),
    path("whatsapp/webhook/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
]
