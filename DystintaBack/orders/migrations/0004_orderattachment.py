# Generated for calculator order attachments.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_order_tracking_statuses"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrderAttachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("file", models.FileField(upload_to="orders/attachments/")),
                ("original_name", models.CharField(blank=True, max_length=255)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="orders.order")),
            ],
            options={
                "abstract": False,
            },
        ),
    ]
