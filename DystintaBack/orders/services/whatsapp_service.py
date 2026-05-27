import logging
import re
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from orders.models import Order

logger = logging.getLogger(__name__)


class WhatsAppConfigurationError(Exception):
    """La integracion no esta configurada para enviar mensajes."""


class WhatsAppDeliveryError(Exception):
    """Evolution API no pudo aceptar o procesar el envio."""


@dataclass(frozen=True)
class WhatsAppSendResult:
    sent: bool
    reason: str = ""
    response: dict[str, Any] | None = None


STATUS_MESSAGE_TEMPLATES = {
    Order.STATUS_NUEVO: "Hola {name}, tu pedido fue recibido correctamente.",
    Order.STATUS_ARCHIVO_RECIBIDO: "Hola {name}, tu pedido fue recibido correctamente.",
    Order.STATUS_EN_REVISION: "Hola {name}, tu pedido esta siendo revisado.",
    Order.STATUS_DISENO: "Hola {name}, tu pedido ya se encuentra en etapa de diseno.",
    Order.STATUS_APROBACION_CLIENTE: (
        "Hola {name}, tu diseno esta listo.\n\n"
        "Responde:\n"
        "1 para aprobar\n"
        "2 para solicitar cambios."
    ),
    Order.STATUS_PRODUCCION: "Hola {name}, tu pedido paso a produccion.",
    Order.STATUS_EN_COLA: "Hola {name}, tu pedido esta en cola de produccion.",
    Order.STATUS_IMPRIMIENDO: "Hola {name}, tu pedido se encuentra en impresion.",
    Order.STATUS_LISTO_RETIRAR: "Hola {name}, tu pedido ya esta listo para retirar.",
    Order.STATUS_ENTREGADO: "Hola {name}, tu pedido fue entregado.",
    Order.STATUS_FINALIZADO: "Hola {name}, tu pedido fue finalizado.",
    Order.STATUS_EN_PAUSA: "Hola {name}, tu pedido esta en pausa temporalmente.",
}


def normalize_whatsapp_phone(value: str | None) -> str:
    """
    Normaliza numeros Paraguay para Evolution API.

    Ejemplos:
    0972908116      -> 595972908116
    +595972908116   -> 595972908116
    595972908116    -> 595972908116
    """

    digits = "".join(char for char in str(value or "") if char.isdigit())

    if not digits:
        return ""

    # Caso 097xxxxxxx
    if digits.startswith("0"):
        digits = "595" + digits[1:]

    # Caso 9xxxxxxxx sin prefijo
    elif digits.startswith("9") and len(digits) == 9:
        digits = "595" + digits

    # Caso que no empiece con 595
    elif not digits.startswith("595"):
        digits = "595" + digits

    return digits


def _setting(name: str, default: str = "") -> str:
    return str(getattr(settings, name, default) or "").strip()


def evolution_is_configured() -> bool:
    return bool(
        _setting("EVOLUTION_API_URL")
        and _setting("EVOLUTION_API_KEY")
        and _setting("EVOLUTION_INSTANCE_NAME")
    )


def build_order_tracking_url(order: Order) -> str:
    """Construye el link publico de seguimiento que ve el cliente."""

    if not order.tracking_token or not order.tracking_enabled:
        return ""

    frontend_url = _setting(
        "FRONTEND_PUBLIC_URL",
        "http://localhost:3000",
    ).rstrip("/")

    return f"{frontend_url}/seguimiento/{order.tracking_token}"


def build_order_status_message(order: Order) -> str:
    template = STATUS_MESSAGE_TEMPLATES.get(
        order.status,
        "Hola {name}, tu pedido cambio de estado a {status}.",
    )

    message = template.format(
        name=order.name or "cliente",
        status=order.status,
        service=order.service,
    )

    tracking_url = build_order_tracking_url(order)

    # El backoffice genera este tracking token al cambiar estado; si existe,
    # el cliente recibe el avance y el link en el mismo WhatsApp automatico.
    if tracking_url:
        progress = order.current_progress or Order.progress_for_status(order.status)
        message = (
            f"{message}\n\n"
            f"Avance actual: {progress}%\n"
            f"Seguimiento del pedido: {tracking_url}"
        )

    return message


def send_text_message(phone: str, text: str) -> WhatsAppSendResult:
    """Envia un mensaje de texto usando Evolution API."""

    try:
        import requests
    except ImportError as exc:
        logger.exception("whatsapp.send.requests_missing")
        raise WhatsAppDeliveryError(
            "Python package 'requests' is not installed"
        ) from exc

    number = normalize_whatsapp_phone(phone)

    if not number:
        logger.warning("whatsapp.send.skipped_missing_phone")
        return WhatsAppSendResult(
            sent=False,
            reason="missing_phone",
        )

    base_url = _setting(
        "EVOLUTION_API_URL",
        "http://127.0.0.1:8012"
    ).rstrip("/")

    api_key = _setting("EVOLUTION_API_KEY")

    instance_name = _setting(
        "EVOLUTION_INSTANCE_NAME",
        "dystinta-main"
    )

    timeout = int(
        getattr(settings, "EVOLUTION_API_TIMEOUT", 15) or 15
    )

    if not api_key:
        logger.warning("whatsapp.send.skipped_missing_api_key")

        return WhatsAppSendResult(
            sent=False,
            reason="missing_api_key",
        )

    url = f"{base_url}/message/sendText/{instance_name}"

    payload = {
        "number": number,
        "text": text,
    }

    headers = {
        "apikey": api_key,
        "Content-Type": "application/json",
    }

    logger.info("EVOLUTION URL: %s", url)
    logger.info("EVOLUTION NUMBER: %s", number)
    logger.info("EVOLUTION PAYLOAD: %s", payload)

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=timeout,
        )

        logger.info(
            "EVOLUTION STATUS CODE: %s",
            response.status_code,
        )

        logger.info(
            "EVOLUTION RESPONSE: %s",
            response.text,
        )

        response.raise_for_status()

    except requests.Timeout as exc:
        logger.exception(
            "whatsapp.send.timeout number=%s",
            number,
        )

        raise WhatsAppDeliveryError(
            "Evolution API timeout"
        ) from exc

    except requests.RequestException as exc:
        logger.exception(
            "whatsapp.send.failed number=%s response=%s",
            number,
            getattr(exc.response, "text", ""),
        )

        raise WhatsAppDeliveryError(
            "Evolution API request failed"
        ) from exc

    try:
        data = response.json()

    except ValueError:
        data = {
            "raw": response.text
        }

    logger.info(
        "whatsapp.send.ok number=%s status_code=%s",
        number,
        response.status_code,
    )

    return WhatsAppSendResult(
        sent=True,
        response=data,
    )


def send_order_status_message(order: Order) -> WhatsAppSendResult:
    """Genera y envia el mensaje automatico correspondiente al estado actual."""

    if not order.phone:
        logger.warning(
            "whatsapp.order_status.skipped_missing_phone order_id=%s",
            order.pk,
        )

        return WhatsAppSendResult(
            sent=False,
            reason="missing_phone",
        )

    message = build_order_status_message(order)

    try:
        result = send_text_message(order.phone, message)

    except WhatsAppDeliveryError:
        logger.exception(
            "whatsapp.order_status.failed order_id=%s status=%s",
            order.pk,
            order.status,
        )

        return WhatsAppSendResult(
            sent=False,
            reason="delivery_error",
        )

    logger.info(
        "whatsapp.order_status.sent order_id=%s status=%s sent=%s reason=%s",
        order.pk,
        order.status,
        result.sent,
        result.reason,
    )

    return result


def send_order_status_message_on_commit(order: Order) -> None:
    """Evita enviar WhatsApp si la transaccion de Django termina fallando."""

    order_id = order.pk

    def _send_after_commit() -> None:
        fresh_order = Order.objects.filter(pk=order_id).first()

        if fresh_order:
            send_order_status_message(fresh_order)

    transaction.on_commit(_send_after_commit)


def extract_text_from_webhook(payload: dict[str, Any]) -> str:
    data = payload.get("data") or {}
    message = data.get("message") or {}

    candidates = [
        message.get("conversation"),
        (message.get("extendedTextMessage") or {}).get("text"),
        (message.get("buttonsResponseMessage") or {}).get("selectedButtonId"),
        (
            message.get("listResponseMessage") or {}
        ).get("singleSelectReply", {}).get("selectedRowId"),
    ]

    for candidate in candidates:
        if candidate:
            return str(candidate).strip()

    return ""


def extract_phone_from_webhook(payload: dict[str, Any]) -> str:
    data = payload.get("data") or {}
    key = data.get("key") or {}

    remote_jid = (
        key.get("remoteJid")
        or data.get("remoteJid")
        or ""
    )

    return normalize_whatsapp_phone(
        str(remote_jid).split("@", 1)[0]
    )


def webhook_is_from_customer(payload: dict[str, Any]) -> bool:
    data = payload.get("data") or {}
    key = data.get("key") or {}

    return not bool(key.get("fromMe"))


def append_internal_note(order: Order, note: str) -> None:
    timestamp = timezone.localtime(
        timezone.now()
    ).strftime("%Y-%m-%d %H:%M")

    entry = f"[{timestamp}] {note}"

    order.notes = (
        f"{order.notes}\n{entry}".strip()
        if order.notes
        else entry
    )


def find_latest_order_waiting_for_approval(phone: str) -> Order | None:
    digits = normalize_whatsapp_phone(phone)

    if not digits:
        return None

    candidates = (
        Order.objects
        .filter(status=Order.STATUS_APROBACION_CLIENTE)
        .order_by("-status_updated_at", "-updated_at")
    )

    for order in candidates:
        order_phone = normalize_whatsapp_phone(order.phone)

        if (
            order_phone.endswith(digits)
            or digits.endswith(order_phone)
        ):
            return order

    return None


def process_evolution_webhook(payload: dict[str, Any]) -> dict[str, Any]:
    """Procesa respuestas 1/2 de clientes y actualiza pedidos."""

    logger.info(
        "whatsapp.webhook.received event=%s instance=%s",
        payload.get("event"),
        payload.get("instance"),
    )

    if not webhook_is_from_customer(payload):
        logger.info("whatsapp.webhook.ignored_from_me")

        return {
            "processed": False,
            "reason": "from_me",
        }

    text = extract_text_from_webhook(payload)

    phone = extract_phone_from_webhook(payload)

    response_code = (
        re.match(r"^\s*([12])\b", text or "")
        or [None, None]
    )[1]

    if response_code not in {"1", "2"}:
        logger.info(
            "whatsapp.webhook.ignored_invalid_response phone=%s text=%s",
            phone,
            text,
        )

        return {
            "processed": False,
            "reason": "invalid_response",
        }

    order = find_latest_order_waiting_for_approval(phone)

    if not order:
        logger.info(
            "whatsapp.webhook.ignored_no_pending_order phone=%s",
            phone,
        )

        return {
            "processed": False,
            "reason": "no_order_waiting_approval",
        }

    if order.status != Order.STATUS_APROBACION_CLIENTE:
        logger.info(
            "whatsapp.webhook.ignored_wrong_status order_id=%s status=%s",
            order.pk,
            order.status,
        )

        return {
            "processed": False,
            "reason": "wrong_status",
            "order_id": order.pk,
        }

    if response_code == "1":
        order.status = Order.STATUS_PRODUCCION

        append_internal_note(
            order,
            "Cliente aprobo el diseno por WhatsApp.",
        )

        action = "approved"

        logger.info(
            "whatsapp.webhook.customer_approved order_id=%s phone=%s",
            order.pk,
            phone,
        )

    else:
        order.status = Order.STATUS_DISENO

        append_internal_note(
            order,
            f"Cliente rechazo el diseno por WhatsApp. Respuesta: {text}",
        )

        action = "rejected"

        logger.info(
            "whatsapp.webhook.customer_rejected order_id=%s phone=%s",
            order.pk,
            phone,
        )

    order.save(
        update_fields=[
            "status",
            "notes",
            "updated_at",
        ]
    )

    return {
        "processed": True,
        "action": action,
        "order_id": order.pk,
        "new_status": order.status,
    }
