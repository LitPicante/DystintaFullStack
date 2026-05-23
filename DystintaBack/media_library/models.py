from django.conf import settings
from django.db import models

from core.models import TimestampedModel


class HomeCarouselMedia(TimestampedModel):
    SLOT_CHOICES = (
        (1, "Slot 1"),
        (2, "Slot 2"),
        (3, "Slot 3"),
    )

    slot = models.PositiveSmallIntegerField(choices=SLOT_CHOICES, unique=True)
    file = models.FileField(upload_to="home-carousel/")
    original_name = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    size = models.PositiveBigIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_home_media",
    )

    def __str__(self):
        return f"HomeCarouselMedia slot {self.slot}"
