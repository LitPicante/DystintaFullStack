from django.urls import path

from .views import (
    AboutContentView,
    CalcContentView,
    ContactContentView,
    DesignsContentView,
    GeneralContentView,
    HomeContentView,
    PublicSiteView,
    ServicesContentView,
)

urlpatterns = [
    path("site/public/", PublicSiteView.as_view(), name="site-public"),
    path("site/general/", GeneralContentView.as_view(), name="site-general"),
    path("site/home/", HomeContentView.as_view(), name="site-home"),
    path("site/about/", AboutContentView.as_view(), name="site-about"),
    path("site/services/", ServicesContentView.as_view(), name="site-services"),
    path("site/designs/", DesignsContentView.as_view(), name="site-designs"),
    path("site/calc/", CalcContentView.as_view(), name="site-calc"),
    path("site/contact/", ContactContentView.as_view(), name="site-contact"),
]
