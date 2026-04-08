from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from core.permissions import IsAdmin
from .models import User
from .serializers import LoginSerializer, UserSerializer


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )

    @action(detail=False, methods=["post"], url_path="logout")
    def logout(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, AttributeError):
                pass
        return Response(status=status.HTTP_205_RESET_CONTENT)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "No autenticado"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    @action(detail=False, methods=["get"], url_path="designers")
    def designers(self, request):
        queryset = User.objects.filter(role=User.ROLE_DESIGNER, is_active=True).order_by("id")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
