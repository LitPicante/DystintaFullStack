import os
import sys

from django.contrib.auth import get_user_model
from django.db import OperationalError, ProgrammingError


DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_ADMIN_NAME = "Administrador"
DEFAULT_DESIGNER_USERNAME = "designer"
DEFAULT_DESIGNER_PASSWORD = "designer123"
DEFAULT_DESIGNER_NAME = "Diseñador"


def should_seed_default_users():
    return "runserver" in sys.argv and os.environ.get("RUN_MAIN") == "true"


def ensure_default_users():
    if not should_seed_default_users():
        return

    User = get_user_model()

    try:
        if not User.objects.filter(username=DEFAULT_ADMIN_USERNAME).exists():
            admin = User(
                username=DEFAULT_ADMIN_USERNAME,
                role=User.ROLE_ADMIN,
                display_name=DEFAULT_ADMIN_NAME,
                is_active=True,
                is_staff=True,
                is_superuser=True,
            )
            admin.set_password(DEFAULT_ADMIN_PASSWORD)
            admin.save()

        if not User.objects.filter(username=DEFAULT_DESIGNER_USERNAME).exists():
            designer = User(
                username=DEFAULT_DESIGNER_USERNAME,
                role=User.ROLE_DESIGNER,
                display_name=DEFAULT_DESIGNER_NAME,
                is_active=True,
                is_staff=False,
                is_superuser=False,
            )
            designer.set_password(DEFAULT_DESIGNER_PASSWORD)
            designer.save()
    except (OperationalError, ProgrammingError):
        # Database or auth tables may not be ready yet during startup.
        return
