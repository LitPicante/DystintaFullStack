# Generated for configurable frontend color themes.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("site_content", "0003_aboutcontentcard"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="theme_primary",
            field=models.CharField(default="#8b4bff", max_length=20),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="theme_secondary",
            field=models.CharField(default="#6a2db8", max_length=20),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="theme_accent",
            field=models.CharField(default="#d7b8ff", max_length=20),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="theme_background",
            field=models.CharField(default="#0b0613", max_length=20),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="theme_surface",
            field=models.CharField(default="#ffffff", max_length=20),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="theme_text",
            field=models.CharField(default="#ffffff", max_length=20),
        ),
    ]
