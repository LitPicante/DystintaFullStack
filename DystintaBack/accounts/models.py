from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = "admin"
    ROLE_DESIGNER = "designer"

    ROLE_CHOICES = (
        (ROLE_ADMIN, "Admin"),
        (ROLE_DESIGNER, "Designer"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    display_name = models.CharField(max_length=255, blank=True)

    @property
    def name(self):
        return self.display_name or self.username

    def __str__(self):
        return f"{self.username} ({self.role})"
