# Generated for dynamic about/advice cards.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_content", "0002_alter_aboutcontent_id_alter_calculatorcontent_id_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="AboutContentCard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=255)),
                ("text", models.TextField(blank=True)),
                ("image", models.ImageField(blank=True, null=True, upload_to="site/about/")),
                ("order", models.PositiveIntegerField(default=0)),
                ("about", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cards", to="site_content.aboutcontent")),
            ],
            options={
                "ordering": ["order", "id"],
                "abstract": False,
            },
        ),
    ]
