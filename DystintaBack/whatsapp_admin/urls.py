from django.urls import path

from .views import (
    WhatsAppInstanceCreateView,
    WhatsAppInstanceDeleteView,
    WhatsAppInstanceListView,
    WhatsAppInstanceLogoutView,
    WhatsAppInstanceQrView,
    WhatsAppInstanceRestartView,
    WhatsAppInstanceStatusView,
)

urlpatterns = [
    path("whatsapp-admin/instances/", WhatsAppInstanceListView.as_view(), name="whatsapp-admin-instances"),
    path("whatsapp-admin/instances/create/", WhatsAppInstanceCreateView.as_view(), name="whatsapp-admin-create"),
    path("whatsapp-admin/instances/<str:name>/qr/", WhatsAppInstanceQrView.as_view(), name="whatsapp-admin-qr"),
    path("whatsapp-admin/instances/<str:name>/status/", WhatsAppInstanceStatusView.as_view(), name="whatsapp-admin-status"),
    path("whatsapp-admin/instances/<str:name>/restart/", WhatsAppInstanceRestartView.as_view(), name="whatsapp-admin-restart"),
    path("whatsapp-admin/instances/<str:name>/logout/", WhatsAppInstanceLogoutView.as_view(), name="whatsapp-admin-logout"),
    path("whatsapp-admin/instances/<str:name>/", WhatsAppInstanceDeleteView.as_view(), name="whatsapp-admin-delete"),
]
