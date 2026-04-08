from django.db import models

from core.models import TimestampedModel


class SiteSettings(TimestampedModel):
    company_name = models.CharField(max_length=255)
    slogan = models.CharField(max_length=255, blank=True)
    whatsapp = models.CharField(max_length=50, blank=True)
    whatsapp_raw = models.CharField(max_length=50, blank=True)
    instagram = models.URLField(blank=True)
    facebook = models.URLField(blank=True)
    tiktok = models.URLField(blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    map_url = models.URLField(blank=True)

    def __str__(self):
        return "SiteSettings"


class HomeContent(TimestampedModel):
    title = models.CharField(max_length=255)
    subtitle = models.TextField(blank=True)
    hero_note = models.TextField(blank=True)
    video1_label = models.CharField(max_length=255, blank=True)
    video2_label = models.CharField(max_length=255, blank=True)
    video3_label = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return "HomeContent"


class AboutContent(TimestampedModel):
    title = models.CharField(max_length=255)
    text = models.TextField(blank=True)

    def __str__(self):
        return "AboutContent"


class ServicesContent(TimestampedModel):
    title = models.CharField(max_length=255)
    textil = models.TextField(blank=True)
    uv = models.TextField(blank=True)
    serigrafia = models.TextField(blank=True)

    def __str__(self):
        return "ServicesContent"


class DesignsContent(TimestampedModel):
    title = models.CharField(max_length=255)
    text = models.TextField(blank=True)

    def __str__(self):
        return "DesignsContent"


class CalculatorContent(TimestampedModel):
    title = models.CharField(max_length=255)
    price_per_cm2 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    extra_rush = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return "CalculatorContent"


class ContactContent(TimestampedModel):
    title = models.CharField(max_length=255)
    text = models.TextField(blank=True)

    def __str__(self):
        return "ContactContent"
