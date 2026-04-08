from django.urls import path

from .views import HomeCarouselMediaViewSet

home_carousel_list = HomeCarouselMediaViewSet.as_view({"get": "list"})
home_carousel_slot = HomeCarouselMediaViewSet.as_view({"post": "upload", "delete": "destroy"})

urlpatterns = [
    path("media/home-carousel/", home_carousel_list, name="home-carousel-list"),
    path("media/home-carousel/<int:slot>/", home_carousel_slot, name="home-carousel-slot"),
]
