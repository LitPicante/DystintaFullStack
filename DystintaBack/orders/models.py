from django.conf import settings
from django.db import models

from core.models import TimestampedModel


class Order(TimestampedModel):
    STATUS_NUEVO = "Nuevo"
    STATUS_REVISION = "En revisión"
    STATUS_DISENO = "En diseño"
    STATUS_APROBACION = "Aprobación cliente"
    STATUS_PRODUCCION = "Producción"
    STATUS_FINALIZADO = "Finalizado"

    STATUS_CHOICES = (
        (STATUS_NUEVO, "Nuevo"),
        (STATUS_REVISION, "En revisión"),
        (STATUS_DISENO, "En diseño"),
        (STATUS_APROBACION, "Aprobación cliente"),
        (STATUS_PRODUCCION, "Producción"),
        (STATUS_FINALIZADO, "Finalizado"),
    )

    SERVICE_DTF_TEXTIL = "DTF Textil"
    SERVICE_DTF_UV = "DTF UV"
    SERVICE_SERIGRAFIA = "Serigrafía"

    SERVICE_CHOICES = (
        (SERVICE_DTF_TEXTIL, "DTF Textil"),
        (SERVICE_DTF_UV, "DTF UV"),
        (SERVICE_SERIGRAFIA, "Serigrafía"),
    )

    service = models.CharField(max_length=50, choices=SERVICE_CHOICES)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    quantity = models.CharField(max_length=100, blank=True)
    details = models.TextField(blank=True)
    file = models.FileField(upload_to="orders/", null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=STATUS_NUEVO)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_orders",
    )
    notes = models.TextField(blank=True)
    extra_data = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Order #{self.pk} - {self.service} - {self.name}"
