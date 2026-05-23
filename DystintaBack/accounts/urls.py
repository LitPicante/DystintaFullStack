from django.urls import path

from .views import AuthViewSet, UserViewSet

auth_login = AuthViewSet.as_view({"post": "login"})
auth_logout = AuthViewSet.as_view({"post": "logout"})
auth_me = AuthViewSet.as_view({"get": "me"})

user_list = UserViewSet.as_view({"get": "list", "post": "create"})
user_detail = UserViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
user_designers = UserViewSet.as_view({"get": "designers"})

urlpatterns = [
    path("auth/login/", auth_login, name="auth-login"),
    path("auth/logout/", auth_logout, name="auth-logout"),
    path("auth/me/", auth_me, name="auth-me"),
    path("users/", user_list, name="users-list"),
    path("users/designers/", user_designers, name="users-designers"),
    path("users/<int:pk>/", user_detail, name="users-detail"),
]
