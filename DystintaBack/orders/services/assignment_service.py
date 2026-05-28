import logging

from django.db import connection
from django.db.models import Count

from accounts.models import User
from orders.models import Order

logger = logging.getLogger(__name__)


def select_designer_for_new_order() -> User | None:
    """
    Selecciona el designer activo con menor carga.

    Reglas:
    1. Primero designers sin pedidos asignados.
    2. Luego el designer con menos pedidos asignados.
    3. En empate, menor id para mantener orden ascendente estable.
    """

    queryset = (
        User.objects.filter(role=User.ROLE_DESIGNER, is_active=True)
        .order_by("id")
        .only("id", "username", "role", "is_active")
    )

    if connection.in_atomic_block:
        queryset = queryset.select_for_update()

    designers = list(queryset)

    if not designers:
        logger.warning("orders.assignment.no_active_designers")
        return None

    designer_ids = [designer.id for designer in designers]
    counts = dict(
        Order.objects.filter(assigned_to_id__in=designer_ids, archived_at__isnull=True)
        .values("assigned_to_id")
        .annotate(total=Count("id"))
        .values_list("assigned_to_id", "total")
    )

    selected = min(
        designers,
        key=lambda designer: (counts.get(designer.id, 0), designer.id),
    )

    logger.info(
        "orders.assignment.selected designer_id=%s assigned_count=%s",
        selected.id,
        counts.get(selected.id, 0),
    )

    return selected
