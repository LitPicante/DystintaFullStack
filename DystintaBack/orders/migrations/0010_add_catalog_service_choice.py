from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0009_order_order_number"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="service",
            field=models.CharField(
                choices=[
                    ("DTF Textil", "DTF Textil"),
                    ("DTF UV", "DTF UV"),
                    ("Serigrafía", "Serigrafía"),
                    ("Catálogo", "Catálogo"),
                ],
                max_length=50,
            ),
        ),
    ]
