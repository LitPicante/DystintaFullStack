import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class EvolutionManagerConfigurationError(Exception):
    """Evolution API admin proxy is not configured."""


class EvolutionManagerRequestError(Exception):
    """Evolution API returned an error or could not be reached."""


def _setting(name: str, default: str = "") -> str:
    return str(getattr(settings, name, default) or "").strip()


def _clean_base64(value: str) -> str:
    if not value:
        return ""
    if "," in value and value.startswith("data:image"):
        return value.split(",", 1)[1]
    return value


def _extract_qr_base64(data: Any) -> str:
    if isinstance(data, str):
        return _clean_base64(data)

    if not isinstance(data, dict):
        return ""

    candidates = [
        data.get("base64"),
        data.get("qrcode"),
        data.get("qr"),
        data.get("code"),
        data.get("pairingCode"),
        (data.get("qrcode") or {}).get("base64") if isinstance(data.get("qrcode"), dict) else "",
        (data.get("qr") or {}).get("base64") if isinstance(data.get("qr"), dict) else "",
        (data.get("data") or {}).get("base64") if isinstance(data.get("data"), dict) else "",
        (data.get("data") or {}).get("qrcode") if isinstance(data.get("data"), dict) else "",
        (data.get("data") or {}).get("qr") if isinstance(data.get("data"), dict) else "",
    ]

    for candidate in candidates:
        if isinstance(candidate, str) and candidate:
            return _clean_base64(candidate)

    return ""


def _extract_state(data: Any) -> str:
    if not isinstance(data, dict):
        return "unknown"

    candidates = [
        data.get("state"),
        data.get("status"),
        data.get("connection"),
        data.get("connectionStatus"),
        (data.get("instance") or {}).get("state") if isinstance(data.get("instance"), dict) else "",
        (data.get("instance") or {}).get("status") if isinstance(data.get("instance"), dict) else "",
        (data.get("data") or {}).get("state") if isinstance(data.get("data"), dict) else "",
        (data.get("data") or {}).get("status") if isinstance(data.get("data"), dict) else "",
        (data.get("data") or {}).get("connection") if isinstance(data.get("data"), dict) else "",
        (data.get("data") or {}).get("connectionStatus") if isinstance(data.get("data"), dict) else "",
    ]

    for candidate in candidates:
        if candidate:
            value = str(candidate).lower()
            if value in {"open", "connected"}:
                return "connected"
            if value in {"connecting", "qrcode", "qr", "pairing"}:
                return "connecting"
            if value in {"close", "closed", "disconnected", "logout"}:
                return "disconnected"
            return value

    return "unknown"


class EvolutionManagerService:
    def __init__(self) -> None:
        self.base_url = _setting("EVOLUTION_API_URL", "http://127.0.0.1:8012").rstrip("/")
        self.api_key = _setting("EVOLUTION_API_KEY")
        self.timeout = int(getattr(settings, "EVOLUTION_API_TIMEOUT", 15) or 15)

        if not self.base_url or not self.api_key:
            logger.warning("whatsapp_admin.config.missing")
            raise EvolutionManagerConfigurationError("Evolution API is not configured")

    @property
    def headers(self) -> dict[str, str]:
        return {
            "apikey": self.api_key,
            "Content-Type": "application/json",
        }

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        logger.info("whatsapp_admin.evolution.request method=%s path=%s", method, path)

        try:
            response = requests.request(
                method,
                url,
                headers=self.headers,
                json=json,
                params=params,
                timeout=self.timeout,
            )
            logger.info(
                "whatsapp_admin.evolution.response path=%s status_code=%s",
                path,
                response.status_code,
            )
            response.raise_for_status()
        except requests.Timeout as exc:
            logger.exception("whatsapp_admin.evolution.timeout path=%s", path)
            raise EvolutionManagerRequestError("Evolution API timeout") from exc
        except requests.RequestException as exc:
            logger.exception(
                "whatsapp_admin.evolution.failed path=%s response=%s",
                path,
                getattr(exc.response, "text", ""),
            )
            raise EvolutionManagerRequestError("Evolution API request failed") from exc

        try:
            return response.json()
        except ValueError:
            return {"raw": response.text}

    def _request_first_success(
        self,
        attempts: list[tuple[str, str]],
        *,
        json: dict[str, Any] | None = None,
    ) -> Any:
        last_error: Exception | None = None

        for method, path in attempts:
            try:
                return self._request(method, path, json=json)
            except EvolutionManagerRequestError as exc:
                logger.warning(
                    "whatsapp_admin.evolution.fallback_failed method=%s path=%s",
                    method,
                    path,
                )
                last_error = exc

        if last_error:
            raise last_error

        raise EvolutionManagerRequestError("Evolution API request failed")

    def list_instances(self) -> dict[str, Any]:
        data = self._request("GET", "/instance/fetchInstances")
        raw_instances = data if isinstance(data, list) else data.get("instances", data.get("data", []))
        instances = []

        if isinstance(raw_instances, dict):
            raw_instances = list(raw_instances.values())

        for item in raw_instances if isinstance(raw_instances, list) else []:
            if not isinstance(item, dict):
                continue
            instance_data = item.get("instance") if isinstance(item.get("instance"), dict) else item
            name = (
                instance_data.get("instanceName")
                or instance_data.get("name")
                or item.get("instanceName")
                or item.get("name")
                or ""
            )
            if not name:
                continue
            instances.append(
                {
                    "name": name,
                    "status": _extract_state(item),
                }
            )

        return {"instances": instances}

    def create_instance(self, name: str) -> dict[str, Any]:
        payload = {
            "instanceName": name,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
        }
        data = self._request("POST", "/instance/create", json=payload)
        return {
            "name": name,
            "status": _extract_state(data),
            "qr_base64": _extract_qr_base64(data),
        }

    def fetch_qr(self, name: str) -> dict[str, Any]:
        data = self.connect_instance(name)
        return {
            "name": name,
            "status": data.get("status", "unknown"),
            "qr_base64": data.get("qr_base64", ""),
        }

    def connect_instance(self, name: str) -> dict[str, Any]:
        data = self._request("GET", f"/instance/connect/{name}")
        return {
            "name": name,
            "status": _extract_state(data),
            "qr_base64": _extract_qr_base64(data),
        }

    def connection_state(self, name: str) -> dict[str, Any]:
        data = self._request("GET", f"/instance/connectionState/{name}")
        return {
            "name": name,
            "status": _extract_state(data),
        }

    def restart_instance(self, name: str) -> dict[str, Any]:
        data = self._request_first_success(
            [
                ("PUT", f"/instance/restart/{name}"),
                ("POST", f"/instance/restart/{name}"),
                ("GET", f"/instance/restart/{name}"),
            ]
        )
        return {
            "name": name,
            "status": _extract_state(data),
        }

    def logout_instance(self, name: str) -> dict[str, Any]:
        data = self._request_first_success(
            [
                ("DELETE", f"/instance/logout/{name}"),
                ("POST", f"/instance/logout/{name}"),
                ("GET", f"/instance/logout/{name}"),
            ]
        )
        return {
            "name": name,
            "status": _extract_state(data) or "disconnected",
        }

    def delete_instance(self, name: str) -> dict[str, Any]:
        data = self._request_first_success(
            [
                ("DELETE", f"/instance/delete/{name}"),
                ("DELETE", f"/instance/{name}"),
            ]
        )
        return {
            "name": name,
            "deleted": True,
        }
