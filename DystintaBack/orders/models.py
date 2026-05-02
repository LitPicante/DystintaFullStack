import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import TimestampedModel


class Order(TimestampedModel):
    STATUS_ARCHIVO_RECIBIDO = "Archivo recibido"
    STATUS_DISENO = "En diseño"
    STATUS_EN_COLA = "En cola"
    STATUS_IMPRIMIENDO = "Imprimiendo"
    STATUS_LISTO_RETIRAR = "Listo para retirar"
    STATUS_ENTREGADO = "Entregado"
    STATUS_EN_PAUSA = "En pausa"
    STATUS_FINALIZADO = "Finalizado"

    STATUS_CHOICES = (
        (STATUS_ARCHIVO_RECIBIDO, "Archivo recibido"),
        (STATUS_DISENO, "En diseño"),
        (STATUS_EN_COLA, "En cola"),
        (STATUS_IMPRIMIENDO, "Imprimiendo"),
        (STATUS_LISTO_RETIRAR, "Listo para retirar"),
        (STATUS_ENTREGADO, "Entregado"),
        (STATUS_EN_PAUSA, "En pausa"),
        (STATUS_FINALIZADO, "Finalizado"),
    )

    STATUS_PROGRESS = {
        STATUS_ARCHIVO_RECIBIDO: 10,
        STATUS_DISENO: 25,
        STATUS_EN_COLA: 40,
        STATUS_IMPRIMIENDO: 65,
        STATUS_LISTO_RETIRAR: 85,
        STATUS_ENTREGADO: 100,
        STATUS_FINALIZADO: 100,
    }

    STATUS_MESSAGES = {
        STATUS_ARCHIVO_RECIBIDO: "Recibimos tu archivo y estamos validando el material.",
        STATUS_DISENO: "Tu pedido está en preparación de diseño.",
        STATUS_EN_COLA: "Tu pedido está en cola de producción.",
        STATUS_IMPRIMIENDO: "Tu pedido se encuentra en impresión.",
        STATUS_LISTO_RETIRAR: "Tu pedido ya está listo para retirar.",
        STATUS_ENTREGADO: "Tu pedido fue entregado.",
        STATUS_EN_PAUSA: "Tu pedido está en pausa temporalmente.",
        STATUS_FINALIZADO: "Pedido finalizado.",
    }

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
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=STATUS_ARCHIVO_RECIBIDO)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_orders",
    )
    notes = models.TextField(blank=True)
    extra_data = models.JSONField(default=dict, blank=True)
    tracking_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    tracking_enabled = models.BooleanField(default=False)
    current_progress = models.PositiveSmallIntegerField(default=10)
    status_updated_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def progress_for_status(cls, status, previous_progress=10):
        if status == cls.STATUS_EN_PAUSA:
            return previous_progress
        return cls.STATUS_PROGRESS.get(status, previous_progress)

    @classmethod
    def message_for_status(cls, status):
        return cls.STATUS_MESSAGES.get(status, "")

    def ensure_tracking_token(self):
        if not self.tracking_token:
            self.tracking_token = uuid.uuid4().hex
        self.tracking_enabled = True

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        previous_status = None
        previous_progress = self.current_progress or 10

        if self.pk:
            previous = Order.objects.filter(pk=self.pk).only("status", "current_progress").first()
            if previous:
                previous_status = previous.status
                previous_progress = previous.current_progress

        status_changed = previous_status is not None and previous_status != self.status
        if is_new:
            self.current_progress = self.progress_for_status(self.status, previous_progress)
        elif status_changed:
            self.ensure_tracking_token()
            self.current_progress = self.progress_for_status(self.status, previous_progress)
            self.status_updated_at = timezone.now()
            update_fields = kwargs.get("update_fields")
            if update_fields:
                kwargs["update_fields"] = set(update_fields) | {
                    "tracking_token",
                    "tracking_enabled",
                    "current_progress",
                    "status_updated_at",
                }
        elif not self.current_progress:
            self.current_progress = self.progress_for_status(self.status, previous_progress)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.pk} - {self.service} - {self.name}"


class OrderAttachment(TimestampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="orders/attachments/")
    original_name = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Attachment #{self.pk} - Order #{self.order_id}"
