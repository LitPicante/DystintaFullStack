# Generated for public order tracking.

from django.db import migrations, models


OLD_STATUS_MAP = {
    "Nuevo": "Archivo recibido",
    "En revisión": "Archivo recibido",
    "En diseño": "En diseño",
    "Aprobación cliente": "En cola",
    "Producción": "Imprimiendo",
    "Finalizado": "Finalizado",
}

STATUS_PROGRESS = {
    "Archivo recibido": 10,
    "En diseño": 25,
    "En cola": 40,
    "Imprimiendo": 65,
    "Listo para retirar": 85,
    "Entregado": 100,
    "Finalizado": 100,
}


def migrate_statuses(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.all():
        order.status = OLD_STATUS_MAP.get(order.status, order.status)
        order.current_progress = STATUS_PROGRESS.get(order.status, order.current_progress or 10)
        order.save(update_fields=["status", "current_progress"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_alter_order_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("Archivo recibido", "Archivo recibido"),
                    ("En diseño", "En diseño"),
                    ("En cola", "En cola"),
                    ("Imprimiendo", "Imprimiendo"),
                    ("Listo para retirar", "Listo para retirar"),
                    ("Entregado", "Entregado"),
                    ("En pausa", "En pausa"),
                    ("Finalizado", "Finalizado"),
                ],
                default="Archivo recibido",
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="tracking_token",
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="order",
            name="tracking_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="current_progress",
            field=models.PositiveSmallIntegerField(default=10),
        ),
        migrations.AddField(
            model_name="order",
            name="status_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(migrate_statuses, migrations.RunPython.noop),
    ]
