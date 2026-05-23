from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import IsAdmin
from .models import HomeCarouselMedia
from .serializers import HomeCarouselMediaSerializer


class HomeCarouselMediaViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        return [IsAdmin()]

    def list(self, request):
        serializer_context = {"request": request}
        records = {item.slot: item for item in HomeCarouselMedia.objects.all()}
        payload = []
        for slot in (1, 2, 3):
            record = records.get(slot)
            if record:
                payload.append(HomeCarouselMediaSerializer(record, context=serializer_context).data)
            else:
                payload.append({"slot": slot, "file": None, "original_name": None})
        return Response(payload)

    def upload(self, request, slot=None):
        if slot not in (1, 2, 3):
            return Response({"detail": "Slot inválido"}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"file": ["Este campo es requerido."]}, status=status.HTTP_400_BAD_REQUEST)

        instance, _ = HomeCarouselMedia.objects.get_or_create(slot=slot)
        if instance.file:
            instance.file.delete(save=False)

        instance.file = uploaded_file
        instance.original_name = uploaded_file.name
        instance.mime_type = getattr(uploaded_file, "content_type", "") or ""
        instance.size = uploaded_file.size or 0
        instance.uploaded_by = request.user
        instance.save()

        serializer = HomeCarouselMediaSerializer(instance, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slot=None):
        if slot not in (1, 2, 3):
            return Response({"detail": "Slot inválido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            instance = HomeCarouselMedia.objects.get(slot=slot)
        except HomeCarouselMedia.DoesNotExist:
            return Response(status=status.HTTP_204_NO_CONTENT)

        if instance.file:
            instance.file.delete(save=False)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
