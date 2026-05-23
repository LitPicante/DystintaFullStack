from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        from .bootstrap import ensure_default_users

        ensure_default_users()
