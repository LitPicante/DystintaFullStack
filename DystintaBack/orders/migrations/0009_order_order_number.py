from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0008_order_archive_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="order_number",
            field=models.CharField(blank=True, max_length=80),
        ),
    ]
