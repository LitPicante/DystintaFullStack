# Generated manually for the WhatsApp automation workflow.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0005_alter_order_id_alter_orderattachment_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("Nuevo", "Nuevo"),
                    ("En revisi\u00f3n", "En revisi\u00f3n"),
                    ("Archivo recibido", "Archivo recibido"),
                    ("En dise\u00f1o", "En dise\u00f1o"),
                    ("Aprobaci\u00f3n cliente", "Aprobaci\u00f3n cliente"),
                    ("Producci\u00f3n", "Producci\u00f3n"),
                    ("En cola", "En cola"),
                    ("Imprimiendo", "Imprimiendo"),
                    ("Listo para retirar", "Listo para retirar"),
                    ("Entregado", "Entregado"),
                    ("En pausa", "En pausa"),
                    ("Finalizado", "Finalizado"),
                ],
                default="Nuevo",
                max_length=50,
            ),
        ),
    ]
