from django.urls import path

from .views import AdminToolsViewSet

admin_export = AdminToolsViewSet.as_view({"get": "export"})
admin_import = AdminToolsViewSet.as_view({"post": "import_data"})
admin_reset = AdminToolsViewSet.as_view({"post": "reset"})

urlpatterns = [
    path("admin/export/", admin_export, name="admin-export"),
    path("admin/import/", admin_import, name="admin-import"),
    path("admin/reset/", admin_reset, name="admin-reset"),
]
